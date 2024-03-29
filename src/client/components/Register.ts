
import Vue from 'vue';
import {$t} from '@/client/directives/i18n';
export const Register = Vue.component('register', {
  data: function() {
    return {
      userName: '',
      password: '',
    };
  },
  methods: {
    register: function() {
      if (this.userName === undefined || this.userName.length <=1) {
        alert($t('Please enter at least 2 characters for userName'));
        return;
      }
      if (this.password === undefined || this.password.length <=2) {
        alert($t('Please enter at least 3 characters for password'));
        return;
      }
      const dataToSend = JSON.stringify({userName: this.userName, password: this.password});

      const onSucces = (response: any) => {
        if (!response.ok) {
          response.text().then((msg: any) =>{
            alert($t(msg));
          });
        } else {
          window.location.href = '/login';
        }
      };

      fetch('/api/register', {'method': 'POST', 'body': dataToSend, 'headers': {'Content-Type': 'application/json'}})
        .then(onSucces)
        .catch((_) => alert('Unexpected server response'));
    },
  },
  template: `
        <div id="create-game">
            <h1><span v-i18n>Terraforming Mars</span> — <span v-i18n>Register</span></h1>
           
            <div class="create-game-players-cont"  >
                <div class="container">
                    <div class="columns">
                        <div class="form-group col6 create-game-player create-game--block register-block" >
                            <div>
                                <input class="form-input form-inline create-game-player-name" :placeholder="'Your Name'" v-model="userName"  />
                            </div>
                            <div>
                                <input class="form-input form-inline create-game-player-name register-input" :placeholder="'Password'" v-model="password"   />
                            </div>
                            <div class="register-action"> 
                                <button class="btn btn-lg btn-success" v-on:click="register" style="min-width: 80px;"  v-i18n>Register</button> 
                            </div>
                        </div>
                       
                    </div>
                </div>
            </div>
        </div>
    `,
});

