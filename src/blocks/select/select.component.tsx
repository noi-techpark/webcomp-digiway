// SPDX-FileCopyrightText: 2025 NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Component, Element, Event, EventEmitter, h, Host, Prop } from "@stencil/core";
import { StencilComponent } from "../../utils/StencilComponent";
import SlimSelect from 'slim-select';

export interface SelectOption {
  value: string;
  text: string;
  icon?: string;
}

/**
 * (INTERNAL) render a select box
 */
@Component({
  tag: 'noi-select',
  styleUrls: [
    '../../../node_modules/slim-select/dist/slimselect.css',
    'select.css',
  ],
  shadow: true,
})
export class SelectComponent implements StencilComponent {

  @Element() el!: HTMLElement;

  /**
   * button 'disabled' property
   *
   * @default false
   */
  @Prop({mutable: true, reflect: true})
  disabled = false;

  private _valueId: string | null = null;
  private _skipEmit = false;

  @Prop({mutable: true})
  get value() {
    return this._valueId;
  }

  set value(valueId: string | null) {
    if (this._valueId !== valueId) {
      console.log('[select] set value:', valueId);
      this._valueId = valueId;
      this._skipEmit = true;
      this._slimSelect?.setSelected(valueId as any);
      // this._refreshData();
    }
  }

  /**
   */
  @Prop({mutable: true})
  get options(): SelectOption[] {
    return this._options || [];
  }

  set options(val: SelectOption[]) {
    this._options = val || [];
    this._refreshData();
  }

  /**
   * Emitted when user clicks on the button
   */
  @Event() selectChange!: EventEmitter<string>;

  private _options: SelectOption[] = [];

  private _select?: HTMLSelectElement;
  private _selectRef?: HTMLElement;

  private _slimSelect?: SlimSelect;

  // @Element()
  // el: HTMLElement;

  componentDidRender() {
    // console.log('[select] componentDidRender');
    if (!!this._slimSelect) {
      return;
    }
    this._slimSelect = new SlimSelect({
      select: this._select!,
      settings: {
        // alwaysOpen: true,
        showSearch: false,

        // In various situations it may be useful to set the contentLocation
        // to an element that will display best
        contentLocation: this._selectRef,
        // contentLocation: this.el.shadowRoot as any,
        contentPosition: 'relative',
        openPosition: 'down',
      },
      // cssClasses: {
      // option: 'styled-option',    // Appended to 'ss-option'
      // main: 'styled-main',         // Appended to 'ss-main'
      // search: 'styled-search'      // Appended to 'ss-search'
      // }
      events: {
        // newVal is an array of Option objects
        afterChange: (newVal) => {
          if (this._skipEmit) {
            this._skipEmit = false;
            return;
          }
          console.log('[select] afterChange:', newVal);
          this._valueId = newVal[0]?.value;
          // const selected = this.options.find(opt => opt.value === selectedSingle);
          this.selectChange.emit(this._valueId);
        }
      }
    });
    this._refreshData();

  }

  _refreshData() {
    if (!this._slimSelect) {
      // not initialized yet
      return;
    }
    // console.log('[select] _refreshData');

    const hasIcon = this._options.find(opt => opt.icon);

    const slimData = [];
    for (const option of this._options) {
      slimData.push({
        text: option.text,
        value: option.value,
        selected: option.value === this._valueId,
        html: hasIcon
          ? `<noi-icon name="${option.icon}"></noi-icon> <span>${option.text}</span>`
          : `<span>${option.text}</span>`,
      });
    }
    // console.log('[select] _refreshData:', slimData);
    // const countries = [
    //   {
    //     text: 'United States',
    //     value: 'US',
    //     html: '<img src="bicycle.svg" class="country"/> Bicycle'
    //   },
    //   {
    //     text: 'United Kingdom',
    //     value: 'UK',
    //     html: '<img src="bicycle.svg" class="country"/> Hiking'
    //   },
    //   // etc...
    // ]
    this._slimSelect.setData(slimData);
  }


  render() {

    // If disabled, the element shouldn't be focusable (-1).
    // Otherwise, use the user's provided tabindex or default to 0.
    const currentTabIndex = this.disabled
      ? '-1'
      : (this.el.getAttribute('tabindex') || '0');

    return <Host class={this.disabled ? 'disabled' : ''} tabIndex={currentTabIndex}>
      <select ref={e => this._select = e}>
        {/* elements are dynamic */}
      </select>
      <div class="select-ref" ref={e => this._selectRef = e}></div>
    </Host>;
  }
}
