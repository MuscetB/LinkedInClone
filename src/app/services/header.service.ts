import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HeaderService {
  private _isHeaderVisible = true;

  hide() {
    this._isHeaderVisible = false;
  }

  show() {
    this._isHeaderVisible = true;
  }

  get isHeaderVisible(): boolean {
    return this._isHeaderVisible;
  }
  constructor() {}
}
