import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {Color} from '@/common/Color';
import {ELobbyRoomStatus, ILobbyRoomView} from '@/common/lobby/LobbyTypes';
import LobbyRoomCard from '@/client/components/lobby/LobbyRoomCard.vue';
import {globalConfig} from '../getLocalVue';

const gameConfig = {
  expansions: {
    prelude: false,
    prelude2: false,
    venus: false,
    colonies: false,
    turmoil: false,
    promo: false,
    ceo: false,
    moon: false,
    pathfinders: false,
    ares: false,
    community: false,
    starwars: false,
    underworld: false,
    breakthrough: false,
    eros: false,
  },
} as any;

const makeRoom = (overrides: Partial<ILobbyRoomView> = {}): ILobbyRoomView => ({
  roomId: 'room-1',
  ownerName: 'Astra',
  players: [
    {name: 'Astra', color: 'red', isOwner: true, isReady: false, isCurrentUser: false},
  ],
  isOwner: false,
  isCurrentUserInRoom: false,
  currentUserReady: false,
  gameConfig,
  status: ELobbyRoomStatus.WAITING,
  maxPlayers: 3,
  createdAt: 1,
  ...overrides,
});

const mountCard = (room: ILobbyRoomView, props: Record<string, unknown> = {}) => mount(LobbyRoomCard, {
  ...globalConfig,
  props: {
    room,
    statusLabel: room.status,
    availableColors: ['green', 'blue'] as Array<Color>,
    selectedColor: 'green' as Color,
    ...props,
  },
});

const buttonWithText = (wrapper: ReturnType<typeof mountCard>, text: string) => wrapper
  .findAll('button')
  .find((button) => button.text().includes(text))!;

describe('LobbyRoomCard', () => {
  it('emits color updates, join, and settings events for a joinable room', async () => {
    const room = makeRoom();
    const wrapper = mountCard(room, {canJoin: true});

    await wrapper.get('#color-room-1-blue').setValue(true);
    await wrapper.get('button[aria-label="View room settings"]').trigger('click');
    await buttonWithText(wrapper, 'Join').trigger('click');

    expect(wrapper.emitted('update:selectedColor')?.[0]).to.deep.equal(['blue']);
    expect(wrapper.emitted('settings')?.[0]).to.deep.equal([room]);
    expect(wrapper.emitted('join')?.[0]).to.deep.equal(['room-1']);
  });

  it('keeps owner actions and kick scoped to the room id', async () => {
    const room = makeRoom({
      isOwner: true,
      players: [
        {name: 'Astra', color: 'red', isOwner: true, isReady: false, isCurrentUser: true},
        {name: 'Borealis', color: 'blue', isOwner: false, isReady: false, isCurrentUser: false},
      ],
    });
    const wrapper = mountCard(room);

    await wrapper.get('button[aria-label="Close room"]').trigger('click');
    await buttonWithText(wrapper, 'Kick').trigger('click');
    await buttonWithText(wrapper, 'Start Game').trigger('click');

    expect(wrapper.emitted('close')?.[0]).to.deep.equal(['room-1']);
    expect(wrapper.emitted('kick')?.[0]).to.deep.equal(['room-1', 'Borealis']);
    expect(wrapper.emitted('start')?.[0]).to.deep.equal(['room-1']);
  });

  it('shows participant leave and confirm actions from server membership state', async () => {
    const room = makeRoom({
      status: ELobbyRoomStatus.CONFIRMING,
      isCurrentUserInRoom: true,
      currentUserReady: false,
      players: [
        {name: 'Astra', color: 'red', isOwner: true, isReady: true, isCurrentUser: false},
        {name: 'Borealis', color: 'blue', isOwner: false, isReady: false, isCurrentUser: true},
      ],
    });
    const wrapper = mountCard(room);

    await buttonWithText(wrapper, 'Leave').trigger('click');
    await buttonWithText(wrapper, 'Confirm').trigger('click');

    expect(wrapper.emitted('leave')?.[0]).to.deep.equal(['room-1']);
    expect(wrapper.emitted('confirm')?.[0]).to.deep.equal(['room-1']);
  });

  it('marks only the pending kick target busy and disables the other kick action', () => {
    const room = makeRoom({
      isOwner: true,
      players: [
        {name: 'Astra', color: 'red', isOwner: true, isReady: false, isCurrentUser: true},
        {name: 'Borealis', color: 'blue', isOwner: false, isReady: false, isCurrentUser: false},
        {name: 'Cinder', color: 'green', isOwner: false, isReady: false, isCurrentUser: false},
      ],
    });
    const wrapper = mountCard(room, {pendingAction: {type: 'kick', playerName: 'Borealis'}});
    const kickButtons = wrapper.findAll('button').filter((button) => button.text().includes('Kick'));

    expect(kickButtons).to.have.length(2);
    expect(kickButtons[0].attributes('aria-busy')).to.equal('true');
    expect((kickButtons[1].element as HTMLButtonElement).disabled).to.equal(true);
    expect(kickButtons[1].attributes('aria-busy')).to.equal(undefined);
  });
});
