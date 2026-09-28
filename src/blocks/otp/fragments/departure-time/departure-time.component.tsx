// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, h, Prop } from "@stencil/core";
import { formatDelaySeconds, formatTransitSeconds } from "../../../../data/noi/otp.util";
import { LanguageDataService } from "../../../../data/language/language-data-service";
import { OtpStoptime } from "../../../../data/noi/Otp";

@Component({
  tag: 'noi-otp-departure-time',
  styleUrl: 'departure-time.css',
  shadow: true,
})
export class DepartureTimeComponent {

  private languageService = LanguageDataService.getInstance();


  @Prop({mutable: true})
  stoptime?: OtpStoptime;

  @Prop({mutable: true})
  showDelay = true;

  render() {
    // const departureDelay = Math.round(Math.random() * 20 - 10) * 60; // DEBUG
    if (!this.stoptime) {
      return '';
    }
    const s = this.stoptime;
    return (<div class="departure-time">
      {s.realtime
        ? <div class="realtime">{formatTransitSeconds(s.realtimeDeparture, this.languageService.currentLanguage!)}</div>
        : <div class="">{formatTransitSeconds(s.scheduledDeparture, this.languageService.currentLanguage!)}</div>}

      {(this.showDelay && s.departureDelay)
        ? <div
          class={'time-delay ' + (s.departureDelay < 0 ? 'time-delay--early' : 'time-delay--late')}>{formatDelaySeconds(s.departureDelay)}</div>
        : ''}
    </div>);
  }
}
