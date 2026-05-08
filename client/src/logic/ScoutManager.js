export class ScoutManager {
  constructor(socket) {
    this._socket    = socket;
    this._scoutInfo = null;
    this._active    = false;
  }

  startScouting() {
    this._active = true;
    this._socket?.scoutStart();
  }

  onReport(data) {
    this._scoutInfo = data;
  }

  getInfo() {
    return this._active ? this._scoutInfo : null;
  }

  stopScouting() {
    this._active    = false;
    this._scoutInfo = null;
  }
}
