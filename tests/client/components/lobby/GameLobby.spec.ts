import {flushPromises, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import GameLobby from '@/client/components/lobby/GameLobby.vue';
import {lobbyService} from '@/client/services';
import * as alerts from '@/client/utils/showAlert';
import {ELobbyRoomStatus, ILobbyListResponse, ILobbyRoomView} from '@/common/lobby/LobbyTypes';
import {globalConfig} from '../getLocalVue';

describe('GameLobby requests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(lobbyService, 'getRooms').mockResolvedValue({rooms: []});
    vi.spyOn(alerts, 'showError').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('blocks repeated operations only for the room being updated', async () => {
    const wrapper = shallowMount(GameLobby, globalConfig);
    await flushPromises();
    let finish!: () => void;
    const request = vi.fn(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    const first = wrapper.vm.runRoomAction('first', {type: 'join'}, request);
    await wrapper.vm.runRoomAction('first', {type: 'join'}, request);
    expect(request.mock.calls).to.have.length(1);

    const otherRequest = vi.fn().mockResolvedValue(undefined);
    await wrapper.vm.runRoomAction('second', {type: 'leave'}, otherRequest);
    expect(otherRequest.mock.calls).to.have.length(1);
    expect(wrapper.vm.pendingRoomActions.first?.type).to.equal('join');
    expect(wrapper.vm.pendingRoomActions.second).to.be.undefined;
    finish();
    await first;
    expect(wrapper.vm.pendingRoomActions.first).to.be.undefined;
    wrapper.unmount();
  });

  it('counts started-only rooms without rendering an empty waiting section', async () => {
    const wrapper = shallowMount(GameLobby, globalConfig);
    await flushPromises();
    const startedRoom: ILobbyRoomView = {
      roomId: 'started', ownerName: 'Commander', players: [], isOwner: false,
      isCurrentUserInRoom: false, currentUserReady: false,
      gameConfig: {} as ILobbyRoomView['gameConfig'],
      status: ELobbyRoomStatus.STARTED, maxPlayers: 2, createdAt: 1,
      gameData: {phase: 'main', id: 'game', players: []},
    };
    await wrapper.setData({rooms: [startedRoom], hasLoadedOnce: true});

    expect(wrapper.vm.roomCount).to.equal(1);
    expect(wrapper.vm.waitingRooms).to.have.length(0);
    expect(wrapper.vm.lobbySections.map((section) => section.key)).to.deep.equal(['section-toggle']);
    wrapper.unmount();
  });

  it('shows a retry state after the initial room fetch fails and clears it after success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(lobbyService.getRooms)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({rooms: []});
    const wrapper = shallowMount(GameLobby, globalConfig);
    await flushPromises();

    expect(wrapper.vm.roomsError).to.be.true;
    expect(wrapper.vm.hasLoadedOnce).to.be.false;
    expect(wrapper.find('portal-panel-stub').exists()).to.be.true;
    expect(vi.mocked(alerts.showError).mock.calls).to.have.length(0);

    await wrapper.vm.fetchRooms();
    await flushPromises();

    expect(wrapper.vm.roomsError).to.be.false;
    expect(wrapper.vm.hasLoadedOnce).to.be.true;
    expect(wrapper.find('portal-panel-stub').exists()).to.be.true;
    wrapper.unmount();
  });

  it('keeps newer room data when an older request completes late', async () => {
    let finishOld!: (response: ILobbyListResponse) => void;
    const room: ILobbyRoomView = {
      roomId: 'newer', ownerName: 'Commander', players: [], isOwner: false,
      isCurrentUserInRoom: false, currentUserReady: false,
      gameConfig: {} as ILobbyRoomView['gameConfig'],
      status: ELobbyRoomStatus.CLOSED, maxPlayers: 2, createdAt: 1,
    };
    vi.mocked(lobbyService.getRooms)
      .mockReturnValueOnce(new Promise((resolve) => {
        finishOld = resolve;
      }))
      .mockResolvedValueOnce({rooms: [room]});
    const wrapper = shallowMount(GameLobby, globalConfig);
    await wrapper.vm.fetchRooms({silent: true});
    finishOld({rooms: []});
    await flushPromises();
    expect(wrapper.vm.rooms.map((value) => value.roomId)).to.deep.equal(['newer']);
    expect(wrapper.vm.loading).to.be.false;
    expect(wrapper.vm.refreshing).to.be.false;
    wrapper.unmount();
  });

  it('restores actions and retains the color choice after a failed request', async () => {
    const wrapper = shallowMount(GameLobby, globalConfig);
    await flushPromises();
    await wrapper.setData({selectedColors: {room: 'green'}});
    await wrapper.vm.runRoomAction('room', {type: 'join'}, () => Promise.reject(new Error('Try again')));
    expect(wrapper.vm.pendingRoomActions.room).to.be.undefined;
    expect(wrapper.vm.selectedColors.room).to.equal('green');
    expect(vi.mocked(alerts.showError).mock.calls[0][0]).to.equal('Try again');
    wrapper.unmount();
  });

  it('stops polling when leaving the lobby', async () => {
    const wrapper = shallowMount(GameLobby, globalConfig);
    await flushPromises();
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(6000);
    expect(vi.mocked(lobbyService.getRooms).mock.calls).to.have.length(1);
  });

  it('waits for a slow fetch before polling again', async () => {
    let finish!: (response: ILobbyListResponse) => void;
    vi.mocked(lobbyService.getRooms).mockReturnValueOnce(new Promise((resolve) => {
      finish = resolve;
    }));
    const wrapper = shallowMount(GameLobby, globalConfig);

    await vi.advanceTimersByTimeAsync(6000);
    expect(vi.mocked(lobbyService.getRooms).mock.calls).to.have.length(1);
    finish({rooms: []});
    await flushPromises();
    expect(wrapper.vm.hasLoadedOnce).to.be.true;

    await vi.advanceTimersByTimeAsync(3000);
    expect(vi.mocked(lobbyService.getRooms).mock.calls).to.have.length(2);
    wrapper.unmount();
  });
});
