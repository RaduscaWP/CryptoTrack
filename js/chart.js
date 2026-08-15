// SVG-based charts: sparkline, area/line w/ crosshair, donut, bars
(function(){
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // CSS vars don't resolve when set as raw SVG fill/stroke attributes.
  // Route paint-like attrs through style so var(--x) / oklch() work.
  const PAINT_ATTRS = { fill:1, stroke:1, 'stop-color':1 };
  function el(tag, attrs){
    const n = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs){
      const v = attrs[k];
      if (PAINT_ATTRS[k] && typeof v === 'string' && (v.indexOf('var(') !== -1 || v.indexOf('oklch') !== -1)){
        n.style[k === 'stop-color' ? 'stopColor' : k] = v;
      } else {
        n.setAttribute(k, v);
      }
    }
    return n;
  }

  function spark(data, opts){
    opts = opts || {};
    const width = opts.width || 80;
    const height = opts.height || 28;
    const color = opts.color || 'var(--ink)';
    const strokeWidth = opts.strokeWidth || 1.5;
    const fill = !!opts.fill;

    const min = Math.min.apply(null, data);
    const max = Math.max.apply(null, data);
    const rng = (max - min) || 1;
    const pts = data.map((v,i) => {
      const x = (i/(data.length-1))*width;
      const y = height - ((v-min)/rng)*(height-2) - 1;
      return [x, y];
    });
    const d = pts.map((p,i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');

    const svg = el('svg', { width, height, viewBox:`0 0 ${width} ${height}` });
    svg.style.display = 'block';

    if (fill){
      const id = 'sg' + Math.random().toString(36).slice(2, 7);
      const defs = el('defs');
      const grad = el('linearGradient', { id, x1:'0', x2:'0', y1:'0', y2:'1' });
      const s1 = el('stop', { offset:'0%',   'stop-color':color, 'stop-opacity':'0.18' });
      const s2 = el('stop', { offset:'100%', 'stop-color':color, 'stop-opacity':'0' });
      grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);
      const area = d + ` L${width} ${height} L0 ${height} Z`;
      svg.appendChild(el('path', { d:area, fill:`url(#${id})` }));
    }

    svg.appendChild(el('path', {
      d, fill:'none', stroke:color, 'stroke-width':strokeWidth,
      'stroke-linecap':'round', 'stroke-linejoin':'round'
    }));
    return svg;
  }

  function areaChart(container, data, opts){
    opts = opts || {};
    const width = 840, height = 260;
    const padL = 48, padR = 16, padT = 18, padB = 28;
    const w = width - padL - padR, h = height - padT - padB;
    const color = opts.color || 'var(--accent)';

    const min = Math.min.apply(null, data);
    const max = Math.max.apply(null, data);
    const rng = (max - min) || 1;
    const pts = data.map((v,i) => {
      const x = padL + (i/(data.length-1))*w;
      const y = padT + h - ((v-min)/rng)*h;
      return [x, y, v, i];
    });
    const d = pts.map((p,i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
    const area = d + ` L${padL+w} ${padT+h} L${padL} ${padT+h} Z`;

    const fmt = opts.yFormat || (v => {
      if (v >= 1000) return '$' + (v/1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
      if (v >= 10)   return '$' + v.toFixed(0);
      if (v >= 1)    return '$' + v.toFixed(2);
      return '$' + v.toFixed(3);
    });
    const tooltipLabel = opts.tooltipLabel || 'Portfolio value';
    const tipFormat = opts.tooltipFormat || (v => '$' + Math.round(v).toLocaleString());

    container.innerHTML = '';
    const svg = el('svg', { viewBox:`0 0 ${width} ${height}` });
    svg.setAttribute('width', '100%');

    const defs = el('defs');
    const grad = el('linearGradient', { id:'areaG', x1:'0', x2:'0', y1:'0', y2:'1' });
    grad.appendChild(el('stop', { offset:'0%',   'stop-color':color, 'stop-opacity':'0.18' }));
    grad.appendChild(el('stop', { offset:'100%', 'stop-color':color, 'stop-opacity':'0' }));
    defs.appendChild(grad); svg.appendChild(defs);

    // y-axis gridlines
    const ticks = 5;
    for (let i = 0; i < ticks; i++){
      const v = min + (rng*(ticks-1-i))/(ticks-1);
      const y = padT + h - ((v-min)/rng)*h;
      svg.appendChild(el('line', {
        x1:padL, x2:padL+w, y1:y, y2:y,
        stroke:'var(--line)', 'stroke-dasharray':'2 4'
      }));
      const t = el('text', { x:padL-10, y:y+4, 'text-anchor':'end', 'font-size':'11', fill:'var(--muted-2)' });
      t.setAttribute('class', 'num');
      t.textContent = fmt(v);
      svg.appendChild(t);
    }

    svg.appendChild(el('path', { d:area, fill:'url(#areaG)' }));
    svg.appendChild(el('path', {
      d, fill:'none', stroke:color, 'stroke-width':'1.75',
      'stroke-linecap':'round', 'stroke-linejoin':'round'
    }));

    const hoverG = el('g');
    hoverG.style.display = 'none';
    const hLine = el('line', {
      y1:padT, y2:padT+h, stroke:color,
      'stroke-dasharray':'3 3', 'stroke-opacity':'.45'
    });
    const hDot = el('circle', { r:'5', fill:'#fff', stroke:color, 'stroke-width':'2' });
    const tipG = el('g');
    const tipRect = el('rect', { width:'130', height:'46', rx:'8', fill:'var(--ink)' });
    const tipKey = el('text', { x:'12', y:'18', 'font-size':'11', fill:'rgba(255,255,255,.6)' });
    tipKey.textContent = tooltipLabel;
    const tipVal = el('text', { x:'12', y:'35', 'font-size':'14', 'font-weight':'600', fill:'#fff' });
    tipVal.setAttribute('class','num');
    tipG.appendChild(tipRect); tipG.appendChild(tipKey); tipG.appendChild(tipVal);
    hoverG.appendChild(hLine); hoverG.appendChild(hDot); hoverG.appendChild(tipG);
    svg.appendChild(hoverG);

    function move(e){
      const rect = svg.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const xPx = (clientX - rect.left) * (width / rect.width);
      const xRatio = Math.max(0, Math.min(1, (xPx - padL) / w));
      const idx = Math.round(xRatio * (data.length - 1));
      const p = pts[idx];
      if (!p) return;
      hoverG.style.display = '';
      hLine.setAttribute('x1', p[0]); hLine.setAttribute('x2', p[0]);
      hDot.setAttribute('cx', p[0]); hDot.setAttribute('cy', p[1]);
      const tx = Math.min(p[0] + 12, width - 140);
      const ty = Math.max(p[1] - 42, padT);
      tipG.setAttribute('transform', `translate(${tx},${ty})`);
      tipVal.textContent = tipFormat(p[2]);
      if (opts.onHover) opts.onHover(idx, p[2]);
    }
    function leave(){
      hoverG.style.display = 'none';
      if (opts.onHover) opts.onHover(null);
    }

    svg.addEventListener('mousemove', move);
    svg.addEventListener('mouseleave', leave);
    svg.addEventListener('touchmove', move, { passive:true });
    svg.addEventListener('touchend', leave);

    container.appendChild(svg);
  }

  function donut(segments, opts){
    opts = opts || {};
    const size = opts.size || 160;
    const thickness = opts.thickness || 20;
    const r = size/2 - thickness/2;
    const c = 2 * Math.PI * r;
    const total = segments.reduce((s,x) => s + x.value, 0);

    const svg = el('svg', { width:size, height:size, viewBox:`0 0 ${size} ${size}` });
    svg.appendChild(el('circle', {
      cx:size/2, cy:size/2, r, fill:'none', stroke:'var(--line)', 'stroke-width':thickness
    }));
    let offset = 0;
    segments.forEach(s => {
      const len = (s.value/total) * c;
      svg.appendChild(el('circle', {
        cx:size/2, cy:size/2, r, fill:'none',
        stroke:s.color, 'stroke-width':thickness,
        'stroke-dasharray':`${len} ${c-len}`,
        'stroke-dashoffset':-offset,
        'stroke-linecap':'butt',
        transform:`rotate(-90 ${size/2} ${size/2})`
      }));
      offset += len;
    });
    return svg;
  }

  function bars(data, opts){
    opts = opts || {};
    const width = opts.width || 320;
    const height = opts.height || 90;
    const color = opts.color || 'var(--accent)';
    const max = Math.max.apply(null, data);
    const bw = width/data.length - 3;

    const svg = el('svg', { viewBox:`0 0 ${width} ${height}` });
    svg.setAttribute('width', '100%');
    svg.style.display = 'block';
    data.forEach((v,i) => {
      const h = (v/max) * (height - 6);
      svg.appendChild(el('rect', {
        x:i*(bw+3), y:height-h, width:bw, height:h, rx:'2',
        fill:color, opacity: 0.25 + 0.75*(v/max)
      }));
    });
    return svg;
  }

  // Bars around a zero baseline — used for daily realised P/L, which goes both ways.
  function barsSigned(data, opts){
    opts = opts || {};
    const width = opts.width || 320;
    const height = opts.height || 80;
    const up = opts.up || 'var(--up)';
    const down = opts.down || 'var(--down)';
    const peak = Math.max.apply(null, data.map(Math.abs).concat([1]));
    const mid = height / 2;
    const bw = Math.max(1, width/data.length - 3);

    const svg = el('svg', { viewBox:`0 0 ${width} ${height}` });
    svg.setAttribute('width', '100%');
    svg.style.display = 'block';

    svg.appendChild(el('line', {
      x1:0, x2:width, y1:mid, y2:mid, stroke:'var(--line-2)', 'stroke-width':'1'
    }));

    data.forEach((v,i) => {
      if (!v) return;
      const h = Math.max(1.5, (Math.abs(v)/peak) * (mid - 4));
      svg.appendChild(el('rect', {
        x:i*(bw+3), y: v >= 0 ? mid - h : mid,
        width:bw, height:h, rx:'2',
        fill: v >= 0 ? up : down,
        opacity: 0.35 + 0.65*(Math.abs(v)/peak)
      }));
    });
    return svg;
  }

  window.CT = Object.assign(window.CT || {}, { spark, areaChart, donut, bars, barsSigned });
})();
