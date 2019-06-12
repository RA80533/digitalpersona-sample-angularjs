import { IComponentOptions, IScope } from 'angular';

import { TokenEnroll } from '../../tokenEnroll';
import template from './contactlessCardChange.html';
import { Credential } from '@digitalpersona/core';
import { IEnrollService, ServiceError } from '@digitalpersona/services';
import { CardsReader, Card, CardInserted, CardRemoved, CardType } from '@digitalpersona/devices';
import { ContactlessCardEnroll } from '@digitalpersona/enrollment';

export default class ContactlessCardChangeControl extends TokenEnroll
{
    public static readonly Component: IComponentOptions = {
        ...TokenEnroll.Component,
        template,
        controller: ContactlessCardChangeControl,
        bindings: {
            ...TokenEnroll.Component.bindings,
            reader: "<",
        },
    };

    private reader: CardsReader;
    private cards: Card[] = [];

    public static $inject = ["EnrollService", "$scope"];
    constructor(
        enrollService: IEnrollService,
        private readonly $scope: IScope,
    ){
        super(Credential.ContactlessCard, enrollService);
    }

    public $onInit() {
        // if a reader is not provided by a parent, work as a standalone component
        // Use multicast subscription here because several controlers will listen for several card types
        this.reader.on<CardInserted>("CardInserted", this.handleCardInserted);
        this.reader.on<CardRemoved>("CardRemoved", this.handleCardRemoved);
    }

    public $onDestroy() {
        this.reader.off("CardInserted", this.handleCardInserted);
        this.reader.off("CardRemoved", this.handleCardRemoved);
    }

    private handleCardInserted = async (ev: CardInserted) => {
        try {
            const card = await this.reader.getCardInfo(ev.deviceId);
            if (!card || card.Type !== CardType.Contactless) return;
            this.cards.push(card);
        }
        catch (error) {
            super.emitOnError(new Error(this.mapDeviceError(error)));
        } finally {
            this.$scope.$apply();
        }
    }

    private handleCardRemoved = (ev: CardRemoved) => {
        const idx = this.cards.findIndex(c => c.Name === ev.cardId);
        if (idx < 0) return;
        this.cards.splice(idx);
        super.emitOnUpdate();
        this.$scope.$apply();
    }

    public async submit(card: Card) {
        super.emitOnBusy();
        try {
            const data = await this.reader.getCardEnrollData(card.Reader);
            await new ContactlessCardEnroll(this.enrollService, this.changeToken)
                .enroll(this.identity, data);
            super.emitOnEnroll();
        } catch (error) {
            super.emitOnError(new Error(this.mapServiceError(error)));
        } finally {
            this.$scope.$apply();
        }
    }

    private mapServiceError(error: ServiceError) {
        switch (error.code) {
            case -2146893033:
            case -2147024891: return "Cards.Create.Error.AccessDenied";
            default: return error.message;
        }
    }

    private mapDeviceError(error: Error): string {
        return error.message;
    }

}