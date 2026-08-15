// First-run overlay that mints the demo account, plus the settings view that
// manages it afterwards (rename, top up, reset, sign out).
(function(){
  const { $, $$, fmtUsd, fmtSigned, fmtPct, toast, timeAgo } = CT;

  const PRESETS = [
    { value: 10000,   label:'$10,000',    note:'Tight risk budget' },
    { value: 100000,  label:'$100,000',   note:'Recommended' },
    { value: 1000000, label:'$1,000,000', note:'Size-up scenarios' }
  ];

  let picked = 100000;

  function show(){
    const box = $('[data-onboard]');
    if (!box) return;
    box.hidden = false;
    document.body.classList.add('has-modal');
    box.innerHTML = `
      <div class="modal">
        <div class="modal__mark">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l4-4 3 3 5-6"/></svg>
        </div>
        <h2 class="modal__title">Open your demo account</h2>
        <p class="modal__copy">
          Virtual cash, live market prices. Test an idea, size a position and see what it
          would have done — without putting a cent at risk.
        </p>

        <label class="field field--plain">
          <span class="field__label">Display name</span>
          <span class="field__box">
            <input class="field__input" type="text" maxlength="40" placeholder="Your name" data-ob-name />
          </span>
        </label>

        <div class="field__label field__label--block">Starting balance</div>
        <div class="preset" data-ob-presets>
          ${PRESETS.map(p => `
            <button class="preset__opt ${p.value === picked ? 'is-active' : ''}" data-preset="${p.value}">
              <span class="preset__val num">${p.label}</span>
              <span class="preset__note">${p.note}</span>
            </button>`).join('')}
        </div>

        <button class="btn-submit" data-ob-create>Create demo account</button>
        <div class="modal__foot">Everything is stored locally in this browser. No sign-up, no real funds, no exchange connection.</div>
      </div>`;

    $$('[data-ob-presets] [data-preset]', box).forEach(b => b.addEventListener('click', () => {
      picked = Number(b.dataset.preset);
      $$('[data-ob-presets] [data-preset]', box).forEach(x => x.classList.toggle('is-active', Number(x.dataset.preset) === picked));
    }));

    const nameInput = $('[data-ob-name]', box);
    function create(){
      const name = (nameInput.value || '').trim() || 'Demo trader';
      CT.account.create({ name, startingCash: picked });
      hide();
      CT.bootAccount();
      toast('Demo account funded with ' + fmtUsd(picked, 0));
    }
    $('[data-ob-create]', box).addEventListener('click', create);
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') create(); });
    setTimeout(() => nameInput.focus(), 60);
  }

  function hide(){
    const box = $('[data-onboard]');
    if (!box) return;
    box.hidden = true;
    box.innerHTML = '';
    document.body.classList.remove('has-modal');
  }

  /* ---------------- settings view ---------------- */

  function renderSettings(){
    const el = $('[data-view="settings"]');
    if (!el) return;
    const acc = CT.account.get();
    if (!acc) return;
    const snap = CT.account.snapshot(CT.live.markets);
    const status = CT.api.status;
    const statusCopy = {
      live:    'Connected — prices are coming straight from the CoinGecko public REST API.',
      cached:  'Serving the last successful response. The public API is rate-limited right now; it will reconnect on its own.',
      offline: 'No response from the API. The dashboard is running on bundled demo prices.'
    };

    el.innerHTML = `
      <div class="grid">
        <section class="card card--span6">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">ACCOUNT</div>
              <div class="card__title">Demo account</div>
            </div>
          </div>
          <label class="field field--plain">
            <span class="field__label">Display name</span>
            <span class="field__box">
              <input class="field__input" type="text" maxlength="40" value="${acc.name.replace(/"/g,'&quot;')}" data-set-name />
            </span>
          </label>
          <div class="kv">
            <div class="kv__row"><span>Opened</span><b class="num">${new Date(acc.createdAt).toLocaleDateString()}</b></div>
            <div class="kv__row"><span>Funded with</span><b class="num">${fmtUsd(acc.startingCash, 0)}</b></div>
            <div class="kv__row"><span>Account value</span><b class="num">${fmtUsd(snap.equity)}</b></div>
            <div class="kv__row kv__row--total"><span>All-time P/L</span><b class="num ${snap.totalPL >= 0 ? 'c-up' : 'c-down'}">${fmtSigned(snap.totalPL)} · ${fmtPct(snap.totalPLPct)}</b></div>
          </div>
          <div class="btnrow">
            <button class="minibtn" data-set-save>Save name</button>
            <button class="minibtn" data-set-topup>Top up $10,000</button>
          </div>
        </section>

        <section class="card card--span6">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">DATA</div>
              <div class="card__title">Market data feed</div>
            </div>
            <span class="chip ${status === 'live' ? 'chip--up' : status === 'offline' ? 'chip--down' : ''}">${status}</span>
          </div>
          <div class="hint hint--pad">${statusCopy[status]}</div>
          <div class="kv">
            <div class="kv__row"><span>Prices &amp; 24h / 7d change</span><b>GET /coins/markets</b></div>
            <div class="kv__row"><span>Price history</span><b>GET /coins/{id}/market_chart</b></div>
            <div class="kv__row"><span>Market cap &amp; dominance</span><b>GET /global</b></div>
            <div class="kv__row"><span>Fear &amp; Greed</span><b>alternative.me /fng</b></div>
            <div class="kv__row kv__row--total"><span>Last successful sync</span><b class="num">${CT.api.lastSync ? timeAgo(CT.api.lastSync) : 'not yet'}</b></div>
          </div>
          <div class="btnrow">
            <button class="minibtn" data-set-refresh>Refresh now</button>
          </div>
        </section>
      </div>

      <div class="grid">
        <section class="card card--span12">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">DANGER ZONE</div>
              <div class="card__title">Start over</div>
            </div>
          </div>
          <div class="hint hint--pad">Resetting wipes every position and fill and returns the balance to ${fmtUsd(acc.startingCash, 0)}. Signing out deletes the account from this browser entirely.</div>
          <div class="btnrow">
            <button class="minibtn minibtn--sell" data-set-reset>Reset account</button>
            <button class="minibtn minibtn--ghost" data-set-signout>Delete &amp; sign out</button>
          </div>
        </section>
      </div>`;

    $('[data-set-save]', el).addEventListener('click', () => {
      try {
        CT.account.rename($('[data-set-name]', el).value);
        CT.refreshChrome();
        toast('Name updated');
      } catch (err){ toast(err.message, 'error'); }
    });

    $('[data-set-topup]', el).addEventListener('click', () => {
      try {
        CT.account.deposit(10000);
        toast('Added $10,000 of demo cash');
        renderSettings();
        CT.refreshChrome();
      } catch (err){ toast(err.message, 'error'); }
    });

    $('[data-set-refresh]', el).addEventListener('click', () => {
      toast('Refreshing market data…');
      CT.live.refresh().then(() => { renderSettings(); toast('Market data refreshed'); });
    });

    $('[data-set-reset]', el).addEventListener('click', () => {
      if (!confirm('Reset the demo account? All positions and fills will be cleared.')) return;
      CT.account.reset();
      CT.refreshChrome();
      renderSettings();
      toast('Demo account reset');
    });

    $('[data-set-signout]', el).addEventListener('click', () => {
      if (!confirm('Delete this demo account from the browser?')) return;
      CT.account.signOut();
      show();
    });
  }

  window.CT = Object.assign(window.CT || {}, { onboardShow: show, onboardHide: hide, renderSettings });
})();
