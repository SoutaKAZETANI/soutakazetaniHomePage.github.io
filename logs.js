window.logDateKey = function (value) {
  const match=String(value||'').trim().match(/^(\d{4})(?:[.\/-](\d{1,2})(?:[.\/-](\d{1,2}))?|年(?:(\d{1,2})月)?(?:(\d{1,2})日)?)?$/);
  if(!match)return -1;
  const year=Number(match[1]),month=Number(match[2]||match[4]||0),day=Number(match[3]||match[5]||0);
  if(year<1000||month>12||day>31||(day&&!month)||((match[2]||match[4])&&!month)||((match[3]||match[5])&&!day))return -1;
  if(day){const date=new Date(Date.UTC(year,month-1,day));if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return -1;}
  // Missing month/day stay unspecified and follow known dates in the same year.
  return year*10000+month*100+day;
};

window.sortLogs = function (doc) {
  doc.querySelectorAll('#articles .article-list,#gamer-articles .article-list').forEach(list=>{
    const records=[...list.children].filter(node=>node.matches('article'));
    const sorted=records.map((node,index)=>({node,index,key:window.logDateKey(node.querySelector('.article-meta span')?.textContent)})).sort((a,b)=>b.key-a.key||a.index-b.index).map(item=>item.node);
    if(records.every((node,index)=>node===sorted[index]))return;
    const slots=records.map(node=>{const slot=doc.createComment('');node.replaceWith(slot);return slot;});
    slots.forEach((slot,index)=>slot.replaceWith(sorted[index]));
  });
};

window.setupLogViews = function(doc){
  window.sortLogs(doc);
  doc.querySelectorAll('#articles .article-list,#gamer-articles .article-list').forEach(list=>{
    list._logGalleryCleanup?.();
    const records=[...list.children].filter(node=>node.matches('article'));
    const dated=records.map(node=>({node,key:window.logDateKey(node.querySelector('.article-meta span')?.textContent)}));
    const years=[...new Set(dated.filter(item=>item.key>0).map(item=>String(Math.floor(item.key/10000))))].sort((a,b)=>Number(b)-Number(a));
    let year=list._logYear||'all',month=list._logMonth||'all';
    if(year!=='all'&&year!=='unknown'&&!years.includes(year)){year='all';month='all';}
    if(month!=='all'){const available=dated.filter(item=>String(Math.floor(item.key/10000))===year).map(item=>Math.floor(item.key/100)%100);if(!available.includes(month==='unknown'?0:Number(month)))month='all';}
    let controls=list.previousElementSibling;
    if(!controls?.hasAttribute('data-log-period-controls')){controls=doc.createElement('nav');controls.className='log-period-controls';controls.dataset.logPeriodControls='';controls.setAttribute('aria-label','記事の期間');list.before(controls);}
    const yearTabs=doc.createElement('div'),monthTabs=doc.createElement('div');yearTabs.className='log-period-tabs';monthTabs.className='log-period-tabs';yearTabs.setAttribute('role','tablist');yearTabs.setAttribute('aria-label','年');monthTabs.setAttribute('role','tablist');monthTabs.setAttribute('aria-label','月');controls.replaceChildren(yearTabs,monthTabs);
    function tabs(parent,values,selected,onSelect){values.forEach(([value,label])=>{const button=doc.createElement('button');button.type='button';button.textContent=label;button.dataset.periodValue=value;button.setAttribute('role','tab');button.setAttribute('aria-selected',String(value===selected));button.tabIndex=value===selected?0:-1;button.onclick=()=>onSelect(value);button.onkeydown=event=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const buttons=[...parent.querySelectorAll('button')],index=buttons.indexOf(button),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();};parent.append(button);});}
    function apply(focusGroup,focusValue){
      list._logYear=year;list._logMonth=month;
      records.forEach((node,index)=>{const key=dated[index].key,y=String(Math.floor(key/10000)),m=String(Math.floor(key/100)%100);node.hidden=!(year==='all'||(year==='unknown'?key<0:y===year))||(year!=='all'&&year!=='unknown'&&month!=='all'&&(month==='unknown'?m!=='0':m!==month));});
      yearTabs.replaceChildren();monthTabs.replaceChildren();tabs(yearTabs,[['all','All'],...years.map(value=>[value,value]),...(dated.some(item=>item.key<0)?[['unknown','日付不明']]:[])],year,value=>{year=value;month='all';apply('year',value);});
      monthTabs.hidden=year==='all'||year==='unknown';
      if(!monthTabs.hidden){const months=[...new Set(dated.filter(item=>String(Math.floor(item.key/10000))===year).map(item=>Math.floor(item.key/100)%100))].sort((a,b)=>a-b);tabs(monthTabs,[['all','All'],...months.filter(value=>value>0).map(value=>[String(value),value+'月']),...(months.includes(0)?[['unknown','月不明']]:[])],month,value=>{month=value;apply('month',value);});}
      if(focusGroup)(focusGroup==='year'?yearTabs:monthTabs).querySelector('[data-period-value="'+focusValue+'"]')?.focus();
    }
    apply();
    const cleanup=[];
    records.forEach(record=>record.querySelectorAll('.article-images').forEach(group=>{
      const images=[...group.querySelectorAll(':scope > img')];if(images.length<2){images.forEach(img=>img.hidden=false);return;}
      group.dataset.logSlideshow='';let index=0,version=0,overlay=null,animation=null,paused=false;
      images.forEach((img,i)=>img.hidden=i!==0);
      const toolbar=doc.createElement('div');toolbar.className='log-gallery-controls';toolbar.dataset.logGalleryControls='';const count=doc.createElement('span');count.textContent='1 / '+images.length;
      function clear(){version++;animation?.cancel();animation=null;overlay?.remove();overlay=null;}
      async function show(next){if(next===index)return;clear();const token=version;images[next].loading='eager';await images[next].decode().catch(()=>{});if(token!==version)return;overlay=doc.createElement('span');overlay.className='log-image-outgoing';overlay.setAttribute('aria-hidden','true');const clone=images[index].cloneNode(true);clone.hidden=false;clone.removeAttribute('id');overlay.append(clone);group.append(overlay);images[index].hidden=true;images[next].hidden=false;index=next;count.textContent=(index+1)+' / '+images.length;animation=overlay.animate([{opacity:1},{opacity:0}],{duration:900,easing:'ease-in-out'});animation.finished.then(()=>{if(token===version){overlay?.remove();overlay=null;animation=null;}}).catch(()=>{});}
      function button(label,text,action){const b=doc.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.title=label;b.textContent=text;b.onclick=action;toolbar.append(b);return b;}
      button('前の画像','←',()=>show((index+images.length-1)%images.length));toolbar.append(count);button('次の画像','→',()=>show((index+1)%images.length));const pause=button('画像の自動切り替えを一時停止','Ⅱ',()=>{paused=!paused;pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'画像の自動切り替えを再開':'画像の自動切り替えを一時停止');pause.title=pause.getAttribute('aria-label');});group.append(toolbar);
      const timer=doc.defaultView.setInterval(()=>{if(!paused&&!doc.hidden&&!record.hidden&&group.getClientRects().length)show((index+1)%images.length);},5000);
      cleanup.push(()=>{doc.defaultView.clearInterval(timer);clear();toolbar.remove();delete group.dataset.logSlideshow;images.forEach(img=>img.hidden=false);});
    }));
    list._logGalleryCleanup=()=>cleanup.forEach(fn=>fn());
  });
};
