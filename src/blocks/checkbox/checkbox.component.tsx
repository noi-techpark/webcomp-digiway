// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, h, Host, Listen, Prop } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";

export interface SelectOption {
  value: string;
  text: string;
  icon?: string;
}

/**
 * (INTERNAL) render a checkbox
 */
@Component({
  tag: 'noi-checkbox',
  styleUrl: 'checkbox.css',
  shadow: true,
})
export class CheckboxComponent implements StencilComponent {

  @Element() el!: HTMLElement;

  /**
   * 'disabled' property
   *
   * @default false
   */
  @Prop({mutable: true, reflect: true})
  disabled = false;

  /**
   * @default false
   */
  @Prop({mutable: true, reflect: true})
  checked = false;

  /**
   * @default false
   */
  @Prop({mutable: true})
  kind: 'checkbox' | 'chevron' = 'checkbox';

  /**
   * @default false
   */
  @Prop({mutable: true})
  loading = false;

  /**
   * Emitted when user clicks on the button
   */
  @Event() checkedChange!: EventEmitter<{ checked: boolean }>;

  @Listen('click')
  handleHostClick(_: MouseEvent) {
    this.checked = !this.checked;
    this.checkedChange.emit({checked: this.checked});
  }

  render() {

    // If disabled, the element shouldn't be focusable (-1).
    // Otherwise, use the user's provided tabindex or default to 0.
    const currentTabIndex = this.disabled
      ? '-1'
      : (this.el.getAttribute('tabindex') || '0');

    return <Host class={this.disabled ? 'disabled' : ''} tabIndex={currentTabIndex}>
      <div>
        <slot/>
      </div>
      <div class="checkbox-state">

        {this.loading
          ? (<noi-spinner></noi-spinner>)
          : (this.kind === 'chevron' ? _chevron(this.checked) : _checkbox(this.checked))
        }
      </div>
    </Host>;
  }
}


function _checkbox(isChecked: boolean) {
  return (isChecked
    ? (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18">
      <path fill="currentColor"
            d="M16 0L2 0C0.89999998 0 0 0.89999998 0 2L0 16C0 17.1 0.89999998 18 2 18L16 18C17.1 18 18 17.1 18 16L18 2C18 0.89999998 17.1 0 16 0ZM7.71 13.29C7.3200002 13.68 6.6900001 13.68 6.3000002 13.29L2.71 9.6999998C2.3199999 9.3100004 2.3199999 8.6800003 2.71 8.29C3.0999999 7.9000001 3.73 7.9000001 4.1199999 8.29L7 11.17L13.88 4.29C14.27 3.9000001 14.9 3.9000001 15.29 4.29C15.68 4.6799998 15.68 5.3099999 15.29 5.6999998L7.71 13.29Z"
            fill-rule="evenodd"/>
    </svg>)
    : (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18">
      <path fill="currentColor"
            d="M15 16L3 16C2.45 16 2 15.55 2 15L2 3C2 2.45 2.45 2 3 2L15 2C15.55 2 16 2.45 16 3L16 15C16 15.55 15.55 16 15 16ZM16 0L2 0C0.89999998 0 0 0.89999998 0 2L0 16C0 17.1 0.89999998 18 2 18L16 18C17.1 18 18 17.1 18 16L18 2C18 0.89999998 17.1 0 16 0Z"
            fill-rule="evenodd"/>
    </svg>));
}

function _chevron(isChecked: boolean) {
  return (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 12 12"
               class={isChecked ? "chevron chevron-opened" : "chevron chevron-closed"}>
    <path fill="currentColor"
          d="M7.53 2.22a.75.75 0 0 1 0 1.06L4.81 6l2.72 2.72a.75.75 0 0 1-1.06 1.06L3.22 6.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0"/>
  </svg>);
}
