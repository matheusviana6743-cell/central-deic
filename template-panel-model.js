import {formLayout} from './form-model.js';
import {sameChannelName} from './deic.js';
export function selectedFormKinds(groups){
 return Object.entries(formLayout).filter(([,layout])=>groups.some(g=>sameChannelName(g.name,layout.category)&&['entry','published','archived'].every(field=>g.channels.some(name=>sameChannelName(name,layout[field]))))).map(([kind])=>kind);
}
export function selectedTextChannels(groups,channels,isText,isPrivate){
 const selected=[];
 for(const group of groups){
  for(const name of group.channels){
   const matches=channels.filter(c=>isText(c)&&sameChannelName(c.parent?.name,group.name)&&sameChannelName(c.name,name));
   if(matches.length!==1)continue;
   const ch=matches[0];
   if(group.access?.length&&!isPrivate(ch))continue;
   selected.push({group,name,channel:ch});
  }
 }
 return selected;
}
