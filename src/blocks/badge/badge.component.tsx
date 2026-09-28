// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, h } from "@stencil/core";

/**
 * (INTERNAL) render a badge.
 */
@Component({
  tag: 'noi-badge',
  styleUrl: 'badge.css',
  shadow: true,
})
export class BadgeComponent {

  render() {
    return (<slot></slot>);
  }
}
