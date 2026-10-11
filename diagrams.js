'use strict';
// Original schematic drawings. Letters match the accompanying practice prompts.
window.drawScienceDiagram=function(canvas,type){
  const w=760,h=430,scale=Math.min(window.devicePixelRatio||1,2);canvas.width=w*scale;canvas.height=h*scale;
  const c=canvas.getContext('2d');c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';
  const green='#277861',red='#c55b52',blue='#437d9c',ink='#304b3e',gray='#9eaaa3';
  function line(x1,y1,x2,y2,color=ink,width=3){c.beginPath();c.strokeStyle=color;c.lineWidth=width;c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
  function text(s,x,y,size=24,color=ink,align='center'){c.font=`${size>=25?'700':'500'} ${size}px -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y);}
  function path(points,color,width=4){c.beginPath();c.lineWidth=width;c.strokeStyle=color;points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  function arrow(x1,y1,x2,y2,color=ink,width=3){line(x1,y1,x2,y2,color,width);const a=Math.atan2(y2-y1,x2-x1),n=10;path([[x2-n*Math.cos(a-.5),y2-n*Math.sin(a-.5)],[x2,y2],[x2-n*Math.cos(a+.5),y2-n*Math.sin(a+.5)]],color,width);}
  function ellipse(x,y,rx,ry,fill,stroke=fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=3;c.stroke();}
  function box(label,x,y,width=130,height=54,color='#edf4ee'){c.fillStyle=color;c.strokeStyle='#cad8ce';c.lineWidth=2;c.beginPath();c.roundRect(x,y,width,height,5);c.fill();c.stroke();text(label,x+width/2,y+height/2+8,23);}
  function axes(x,y,width,height,xlabel,ylabel){arrow(x,y,x+width,y,gray,2);arrow(x,y,x,y-height,gray,2);text(xlabel,x+width/2,y+38,21);text(ylabel,x+width/2,y-height-18,21);}
  function net(two=false){
    const x=70,y=295,width=620,high=215;axes(x,y,width,high,'시간','이산화 탄소 순흡수량');line(x,y+65,x,y,gray,2);text('0',x-20,y+7,20);text('흡수',x-8,125,18,green,'right');text('방출',x-8,350,18,red,'right');
    const dayPoints=[[0,40],[.12,38],[.20,0],[.25,-100],[.32,-185],[.40,-195],[.48,-165],[.57,-85],[.66,0],[.72,35],[1,40]];
    const points=[];for(let d=0;d<(two?2:1);d++)for(const [a,b] of dayPoints)points.push([x+(d+a)*width/(two?2:1),y+b]);path(points,green,5);
    if(two){text('첫째 날',225,390,21);text('둘째 날',535,390,21);c.setLineDash([6,6]);line(380,80,380,355,gray,2);c.setLineDash([]);}
    else{for(const [s,a,b] of [['A',.2,0],['B',.4,-195],['C',.88,40]]){ellipse(x+a*width,y+b,5,5,green);text(s,x+a*width,y+b-17,25);}text('낮',335,390,20);text('밤',610,390,20);}
  }
  if(type==='factors'){
    for(const [i,label] of ['빛의 세기','이산화 탄소 농도','온도'].entries()){
      const x=30+i*245,y=305;axes(x,y,204,205,label,'광합성량');c.beginPath();c.moveTo(x+5,y-5);
      if(i<2){c.bezierCurveTo(x+65,y-170,x+75,y-160,x+195,y-160);}else{c.bezierCurveTo(x+85,y-10,x+110,y-240,x+148,y-183);c.bezierCurveTo(x+170,y-150,x+184,y-45,x+195,y-30);}c.strokeStyle=i===2?red:green;c.lineWidth=5;c.stroke();
    }text('다른 조건은 같게',380,393,21,gray);
  }else if(type==='sensor'){
    axes(90,335,570,240,'시간','기체 X의 농도');c.fillStyle='#eff4e8';c.fillRect(110,95,150,240);c.fillStyle='#fff0db';c.fillRect(320,95,150,240);text('I',185,130,26);text('II',395,130,26);path([[90,310],[270,290],[470,155],[600,145],[655,105]],green,5);
  }else if(type==='netday'||type==='nettwo'){net(type==='nettwo');
  }else if(type==='blood'){
    ellipse(380,213,224,172,'#fff3cf','#ddd0a8');for(const [x,y] of [[263,120],[410,104],[515,157],[492,294],[296,326]]){ellipse(x,y,35,23,'#df8276',red);ellipse(x,y,15,9,'#bc4d45');}
    ellipse(294,234,55,48,'#c6d2e5',blue);ellipse(278,230,18,25,'#75648d');ellipse(314,235,16,23,'#75648d');for(const [x,y] of [[418,204],[418,323],[531,223]]){path([[x-9,y],[x+9,y],[x,y-9],[x,y+9],[x-9,y]],red,4);}
    line(255,118,151,85);text('A',126,88,27);line(242,234,132,234);text('B',108,241,27);line(508,82,588,51);text('C',615,55,27);line(534,223,630,232);text('D',655,240,27);
  }else if(type==='digest'){
    path([[432,28],[432,80]],red,15);ellipse(465,128,67,60,'#f3c8ab','#c39274');
    c.beginPath();c.moveTo(245,80);c.bezierCurveTo(315,25,408,45,440,72);c.lineTo(352,122);c.lineTo(249,152);c.closePath();c.fillStyle='#c99879';c.fill();ellipse(337,133,24,13,'#93b079',green);
    path([[244,345],[220,345],[220,215],[528,215],[528,356],[438,356],[438,397]],'#be8d79',22);
    path([[280,250],[467,250],[467,279],[287,279],[287,310],[465,310],[465,337],[324,337]],'#dfb39f',20);
    ellipse(450,195,85,13,'#dfbf75','#ba9e58');path([[337,146],[337,189],[278,189],[278,247]],green,5);
    const labels=[['A',242,99,151,70],['B',321,135,153,143],['C',220,280,135,280],['D',520,112,605,88],['E',523,193,620,191],['F',468,310,620,321]];
    for(const [s,x,y,tx,ty] of labels){line(x,y,tx,ty,gray,2);text(s,tx+(tx<300?-20:20),ty+6,27);}
  }else if(type==='heart'){
    ellipse(380,222,160,177,'#f6e7e0','#d5b9af');box('A',242,108,112,95,'#dfecf3');box('C',399,108,112,95,'#f8e1db');box('B',242,228,112,119,'#dfecf3');box('D',399,228,112,119,'#f8e1db');arrow(298,203,298,228,blue);arrow(455,203,455,228,red);text('ㄱ',544,219,26);line(524,214,478,214,gray);text('몸의 오른쪽',298,393,18,gray);text('몸의 왼쪽',455,393,18,gray);
  }else if(type==='circulation'){
    box('폐',312,22,136,52);box('(가)',224,148,130,60,'#e5eef4');box('(나)',224,224,130,60,'#e5eef4');box('(다)',418,148,130,60,'#f7e6df');box('(라)',418,224,130,60,'#f7e6df');box('온몸',312,355,136,52);
    arrow(289,208,289,224,blue);arrow(483,208,483,224,red);path([[224,255],[149,255],[149,49],[312,49]],blue,5);arrow(285,49,311,49,blue,5);text('A',112,157,27,blue);path([[448,49],[610,49],[610,178],[548,178]],red,5);arrow(578,178,548,178,red,5);text('C',645,120,27,red);
    path([[548,255],[610,255],[610,381],[448,381]],red,5);arrow(478,381,448,381,red,5);text('D',645,330,27,red);path([[312,381],[149,381],[149,179],[224,179]],blue,5);arrow(194,179,224,179,blue,5);text('B',112,325,27,blue);
  }else if(type==='resporgans'){
    ellipse(380,61,46,38,'#f3e4d9','#c6aea1');path([[361,72],[380,82],[380,160]],blue,13);path([[380,154],[328,215],[307,275]],blue,10);path([[380,154],[432,215],[453,275]],blue,10);
    ellipse(282,241,75,105,'#f3ddd8','#bd8177');ellipse(478,241,75,105,'#f3ddd8','#bd8177');path([[380,154],[328,215],[290,245]],blue,9);path([[380,154],[432,215],[470,245]],blue,9);
    c.beginPath();c.moveTo(210,374);c.quadraticCurveTo(380,315,550,374);c.strokeStyle=green;c.lineWidth=8;c.stroke();for(const [s,x,y,tx,ty] of [['A',356,65,238,38],['B',380,122,563,112],['C',418,201,607,203],['D',274,260,126,260],['E',381,345,613,372]]){line(x,y,tx,ty,gray,2);text(s,tx+(tx<300?-20:20),ty+6,26);}
  }else if(type==='kidneys'){
    for(const [x,flip] of [[265,1],[495,-1]]){c.save();c.translate(x,130);c.scale(flip,1);c.beginPath();c.moveTo(10,-70);c.bezierCurveTo(-100,-90,-105,85,8,70);c.bezierCurveTo(55,55,-40,25,-10,-5);c.bezierCurveTo(22,-30,55,-65,10,-70);c.fillStyle='#c67c6d';c.fill();c.restore();path([[x,160],[x+flip*18,245],[380+flip*-40,300]],'#bb9654',8);}
    ellipse(380,322,59,47,'#e6c26c','#b09242');arrow(380,369,380,410,'#bb9654',8);for(const [s,x,y,tx,ty]of[['A',533,121,637,96],['B',496,236,634,221],['C',439,322,638,314],['D',380,392,635,389]]){line(x,y,tx,ty,gray,2);text(s,tx+22,ty+7,26);}
  }else if(type==='nephron'){
    ellipse(216,142,67,59,'#fff4dc','#bb9f66');for(let i=0;i<4;i++)ellipse(197+i*13,138+(i%2)*10,17,26,'#f6c3ba',red);
    path([[91,70],[145,70],[181,111]],red,11);arrow(64,70,95,70,red,4);text('E',48,73,25,red);path([[247,105],[341,70],[545,70],[545,354],[636,354]],red,10);arrow(607,354,646,354,red,4);text('F',682,362,25,red);
    path([[217,200],[217,239],[315,239],[315,337],[444,337],[444,147],[620,147],[620,269]],'#d9b76f',18);arrow(620,242,620,285,'#b2995b',4);text('오줌',620,318,20,gray);
    path([[349,77],[349,195],[355,307],[407,307],[407,116],[515,116],[515,322],[544,354]],blue,7);
    line(210,140,210,41,gray,2);text('A',210,27,27);line(159,170,93,183,gray,2);text('B',64,197,27);line(404,275,484,277,gray,2);text('C',497,284,27);line(325,337,325,390,gray,2);text('D',325,417,27);
  }else if(type==='alveoli'){
    path([[380,30],[380,130],[315,181]],'#bcaa8b',22);path([[380,130],[444,182]],'#bcaa8b',22);for(const [x,y]of[[297,214],[374,228],[453,219],[338,299],[419,303]])ellipse(x,y,47,49,'#f6e5dc','#c79a8b');path([[229,166],[211,230],[250,321],[321,367],[442,364],[522,314],[545,221],[498,157]],blue,8);path([[240,177],[256,248],[301,207],[346,323],[396,264],[454,337],[488,251],[472,178]],red,5);line(338,299,144,333,gray,2);text('(가)',111,342,27);
  }else if(type==='breathmodel'){
    path([[268,72],[232,336],[528,336],[492,72]],gray,5);line(268,72,492,72,gray,4);path([[380,20],[380,169],[320,223]],ink,11);path([[380,169],[440,223]],ink,11);ellipse(310,250,47,59,'#e8b885','#b49065');ellipse(450,250,47,59,'#e8b885','#b49065');path([[232,338],[380,378],[528,338]],blue,10);arrow(380,383,380,417,red,4);text('아래로 당김',554,398,22);text('컵',574,165,23);line(537,159,498,159,gray,2);text('Y자관',534,38,23);line(484,38,390,38,gray,2);text('작은 풍선',157,260,23);line(227,252,264,252,gray,2);text('큰 고무막',149,364,23);line(210,355,245,341,gray,2);
  }
};
