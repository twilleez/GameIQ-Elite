export function emptyStats(){
  return {
    p2m:0,p2a:0,p3m:0,p3a:0,ftm:0,fta:0,
    reb:0,ast:0,tov:0,stl:0,blk:0,fouls:0,tfouls:0,
    onCourt:true,minsOn:0,courtEnteredAt:null
  };
}

export function points(stats={}){
  return (stats.p2m||0)*2 + (stats.p3m||0)*3 + (stats.ftm||0);
}

export function fieldGoalsMade(stats={}){
  return (stats.p2m||0) + (stats.p3m||0);
}

export function fieldGoalsAttempted(stats={}){
  return (stats.p2a||0) + (stats.p3a||0);
}

export function percent(made=0,attempted=0){
  return attempted ? Math.round((made/attempted)*100) : 0;
}

export function effectiveFieldGoalPercent(stats={}){
  const attempts=fieldGoalsAttempted(stats);
  return attempts ? Math.round(((fieldGoalsMade(stats)+0.5*(stats.p3m||0))/attempts)*100) : 0;
}

export function isThreePointShot(x,y){
  const px=Number(x),py=Number(y);
  if(!Number.isFinite(px)||!Number.isFinite(py)) return false;
  if(px<=28 || px>=372) return true;
  return Math.hypot(px-200,py-17) > 174;
}

export function sumPeriods(player={}){
  const total=emptyStats();
  for(const period of [1,2,3,4,"OT"]){
    const stats=player.q?.[period]||{};
    for(const key of Object.keys(total)){
      if(typeof total[key]==="number") total[key]+=Number(stats[key]||0);
    }
  }
  return total;
}

export function sumTeam(players=[]){
  const total=emptyStats();
  for(const player of players){
    const stats=sumPeriods(player);
    for(const key of Object.keys(total)){
      if(typeof total[key]==="number") total[key]+=stats[key];
    }
  }
  return total;
}
