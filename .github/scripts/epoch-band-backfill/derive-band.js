// epoch-band-backfill/derive-band.js v2 — band metrics with EXACT band semantics
// Sources: member-data/tla-snapshot/pool-status-history.json (active + staked_usd)
//          member-data/tla-snapshot/apr-history.json (apr_pct_avg)
//          docs/epoch_1-300_date.json (epoch → date), network-and-prices daily (LUNA)
// Emits epoch-band-history.json. Amplified APR deliberately absent (needs
// bucket-amp factors these matrices don't carry). Rewards/bribes booked separately.
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=process.env.LOCAL_DATA_DIR||'.';
const OUT=process.argv[2]||'./out-band';
const ps=JSON.parse(fs.readFileSync(path.join(ROOT,'member-data/tla-snapshot/pool-status-history.json'),'utf8'));
const ah=JSON.parse(fs.readFileSync(path.join(ROOT,'member-data/tla-snapshot/apr-history.json'),'utf8'));
const epDates=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/epoch_1-300_date.json'),'utf8'));
const epMap=new Map((Array.isArray(epDates)?epDates:epDates.epochs||[]).map(e=>[e.epoch,e]));
const dateOf=(ep)=>{const e=epMap.get(ep); return e?String(e.end_time||e.start_time||'').slice(0,10):null;};
const rows=[];
for(const ep of ps.epochs){
  let act=0, astro=0, ss=0, tvl=0;
  for(const p of ps.pools){
    const e=p.epochs&&p.epochs[ep]; if(!e||!e.active) continue;
    act++; tvl+=(+e.staked_usd||0);
    const dx=(p.dex||'').toLowerCase();
    if(dx.includes('astro')) astro++; else if(dx.includes('skel')||dx.includes('ww')) ss++;
  }
  let aprSum=0, aprN=0;
  for(const p of ah.pools){
    const e=p.epochs&&p.epochs[ep]; if(!e||e.status!=='active'||e.apr_pct_avg==null) continue;
    aprSum+=e.apr_pct_avg; aprN++;
  }
  let date=dateOf(ep); let luna=null;
  if(date&&date>='2026-05-13'){
    // price chain: np daily (15-day retention) → tla-snapshot daily
    // totals.rewards.luna_price_used (full archive since 2026-05-13),
    // walking back up to 3 days for the nearest capture.
    const today=new Date().toISOString().slice(0,10);
    const startDate = date>today ? today : date;   // current epoch ends in the future — price from the latest capture
    for(let b=0;b<6&&luna==null;b++){
      const d2=new Date(Date.parse(startDate+'T00:00:00Z')-b*86400000).toISOString().slice(0,10);
      const f=path.join(ROOT,'network-and-prices/daily',d2+'.json');
      if(fs.existsSync(f)){ try{const np=JSON.parse(fs.readFileSync(f,'utf8')); luna=(np.luna_market&&(np.luna_market.usd_price??np.luna_market.price_usd))??null;}catch(e){} }
      if(luna==null){
        const g=path.join(ROOT,'member-data/tla-snapshot/daily',d2+'.json');
        if(fs.existsSync(g)){ try{const sn=JSON.parse(fs.readFileSync(g,'utf8')); luna=sn.totals?.rewards?.luna_price_used??null;}catch(e){} }
      }
    }
  }
  // band's Active Pools tile = astro + SS (Single-asset pools excluded there);
  // total kept as its own field. APR intentionally ABSENT: apr_pct_avg in the
  // matrix uses a different basis than the band's live calc (323% vs 47% at
  // E199) — shipping it would be a confident wrong number.
  rows.push({epoch:ep, date, active_pools:astro+ss, active_pools_astro:astro, active_pools_ss:ss,
    active_pools_total_incl_single:act,
    tla_tvl_usd:+tvl.toFixed(0), luna_price_usd:luna, source:'derived:snapshot-matrices-v2'});
}
fs.mkdirSync(path.join(OUT,'member-data/tla-snapshot'),{recursive:true});
fs.writeFileSync(path.join(OUT,'member-data/tla-snapshot/epoch-band-history.json'),
  JSON.stringify({schemaVersion:2, generatedAt:new Date().toISOString(),
    method:'.github/scripts/epoch-band-backfill/derive-band.js — pool-status-history (active+staked_usd) + apr-history (apr_pct_avg), band-identical semantics',
    note:'active_pools matches the band tile (Astro+SS; Singles in the _total field). APR averages, rewards, and bribes are NOT here — their band calcs use sources these matrices do not carry; booked separately.',
    epochs:rows},null,1));
for(const r of rows.slice(-3)) console.log(r.epoch,r.date,'pools',r.active_pools,'(A'+r.active_pools_astro+'+S'+r.active_pools_ss+')','tvl $'+(r.tla_tvl_usd/1e6).toFixed(2)+'M','luna',r.luna_price_usd);
console.log('rows:',rows.length);
