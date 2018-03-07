import Request from 'request-promise-native';
import { Component } from 'react';
import _ from 'lodash';

class HarmonyApi extends Component {
    constructor(baseUrl) {
        super();
        this._baseUrl = baseUrl ? baseUrl : 'https://harmony.thinaer.io'
    }

    request(path, method, options) {
        let opts = {
            uri: `${this._baseUrl}${path}`,
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': localStorage['harmony-user-token']
            },
            method: method,
            json: true,
        };
        return Request(_.merge(opts, options));
    }

    get(path, params, options = {}) {
        return this.request(path, 'GET', _.merge({
            qs: params
        }, options));
    };

    post(path, params, options) {
        return this.request(path, 'POST', _.merge({
            body: params
        }, options));
    }

    destroy(path, options) {
        return this.request(path, 'DELETE', options);
    };

    put(path, params, options) {
        return this.request(path, 'PUT', _.merge({
            body: params
        }, options));
    }

    getToken(username, password) {
        return this.post('/api/1/auth/login', {username: username, password: password}).then((res) => {
            localStorage['harmony-user-token'] = res.token;
        }).catch((er) => {
            console.log("Got an error attempting to get a token from Harmony", er);
            throw er;
        });
    }
}

export default HarmonyApi;