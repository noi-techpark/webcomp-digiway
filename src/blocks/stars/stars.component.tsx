// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, h, Prop } from "@stencil/core";

/**
 * (INTERNAL) render stars.
 */
@Component({
  tag: 'noi-stars',
  styleUrl: 'stars.css',
  shadow: true,
})
export class StarsComponent {

  @Prop({mutable: true})
  stars: number = 0;

  @Prop({mutable: true})
  total: number = 5;

  render() {
    const starArr = [...new Array(this.total)].map((_, i) => i + 1);
    return (<div>
      {starArr.map((s) => _star(s<=this.stars))}
    </div>);
  }
}

function _star(isFilled: boolean) {
  if (isFilled) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="star-filled">
        <path d="M233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Z"/>
      </svg>);
  } else {
    return (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="star-empty">
      <path
        d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm247-350Z"/>
    </svg>);
  }
}
