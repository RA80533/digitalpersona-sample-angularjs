import { IComponentOptions, IController } from 'angular';

import template from './userInfo.html';
import { JSONWebToken, Ticket, User } from '@digitalpersona/core';
import { IEnrollService } from '@digitalpersona/services';

export default class UserInfoControl implements IController
{
    public static readonly Component: IComponentOptions = {
        template,
        controller: UserInfoControl,
        bindings: {
            identity: "<",
        },
    };

    public readonly identity: JSONWebToken;
    public readonly changeToken: JSONWebToken;

    public static $inject = ["EnrollService"];
    public constructor(
        private readonly enrollService: IEnrollService,
    ){}

    private userName() {
        const user = User.fromJWT(this.identity);
        return user.name;
    }

    private async deleteAccount() {
        await this.enrollService.DeleteUser(new Ticket(this.changeToken), User.fromJWT(this.identity));
    }
}