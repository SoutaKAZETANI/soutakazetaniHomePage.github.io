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
