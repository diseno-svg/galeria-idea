/* Galería IDEA · «En vivo»
 * Lee directo de Google Drive lo subido en los últimos días (carpetas nuevas de «Sin Editar» y las carpetas
 * de cada sede en «Editado»), para que aparezca en la galería sin esperar al registro de Airtable.
 * Lo usan nuevo.html (galería) y alumnos.js (enlace de alumnos). Se carga siempre fresco (?v=fecha).
 */
(function(){
  'use strict';
  var KEY='AIzaSyDG8OEUiJTqQdNck1NJZhOpD36Q1VBaAyQ';
  var SIN_EDITAR='1vva8V2Ua9Aqe42Oe6NKVeZalpXpqJ7M4';
  var EDITADO='1yJVzwrJVgTlDIve6L4FQjHBB2Qvqpyxk';
  var DIAS_NUEVAS=14, DIAS_TOCADAS=3, MAX_CARPETAS=30;
  var SEDES={BRM:'Barquisimeto',CCS:'Caracas',MAR:'Maracaibo',PMV:'Margarita',SCI:'San Cristóbal',VLN:'Valencia',CHA:'Charallave'};
  var NOMBRES_SEDE={BARQUISIMETO:'Barquisimeto',CARACAS:'Caracas',MARACAIBO:'Maracaibo',MARGARITA:'Margarita',
    'SAN CRISTOBAL':'San Cristóbal','SAN CRISTÓBAL':'San Cristóbal',VALENCIA:'Valencia',CHARALLAVE:'Charallave'};
  var MEDIA="(mimeType contains 'image/' or mimeType contains 'video/')";

  function hace(d){return new Date(Date.now()-d*864e5).toISOString().replace(/\.\d+Z$/,'');}
  function listar(q,campos){
    var todos=[];
    function pagina(tok){
      var u='https://www.googleapis.com/drive/v3/files?q='+encodeURIComponent(q)+
        '&fields='+encodeURIComponent('nextPageToken,files('+campos+')')+'&pageSize=1000'+
        '&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=createdTime%20desc&key='+KEY+(tok?'&pageToken='+tok:'');
      return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(function(d){
        todos=todos.concat(d.files||[]);
        return d.nextPageToken&&todos.length<3000?pagina(d.nextPageToken):todos;
      });
    }
    return pagina('');
  }
  function fila(f,album,estado,sede){
    var partes=album.split(/\s+-\s+/), m=album.match(/(20\d{2})-\d{2}-\d{2}/);
    if(!sede&&partes[1]&&SEDES[partes[1].trim()])sede=SEDES[partes[1].trim()];
    return {
      id:'vivo_'+f.id, nombre:f.name, driveId:f.id, enlace:'https://drive.google.com/file/d/'+f.id+'/view',
      album:album, estado:estado, sede:sede||'', servicio:'',
      tipo:/^video\//.test(f.mimeType)?'Video':'Foto',
      fechaRegistro:String(f.createdTime||'').slice(0,10), anio:m?m[1]:'',
      evento:partes.length>=5?partes[partes.length-1]:'', grupo:partes.length>=5?partes[3]:'',
      tipoEvento:'', fecha:'', _vivo:true
    };
  }
  function cargar(){
    var nuevas="createdTime > '"+hace(DIAS_NUEVAS)+"'", tocadas="modifiedTime > '"+hace(DIAS_TOCADAS)+"'";
    var carpetasSE=listar("'"+SIN_EDITAR+"' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false and ("+nuevas+" or "+tocadas+")",'id,name,createdTime');
    var carpetasED=listar("'"+EDITADO+"' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",'id,name,createdTime');
    return Promise.all([carpetasSE,carpetasED]).then(function(res){
      var trabajos=[];
      res[0].slice(0,MAX_CARPETAS).forEach(function(c){
        trabajos.push(listar("'"+c.id+"' in parents and trashed=false and "+MEDIA,'id,name,mimeType,createdTime').then(function(fs){
          return fs.map(function(f){return fila(f,c.name,'Sin Editar','');});
        }).catch(function(){return [];}));
      });
      res[1].forEach(function(c){
        var nom=String(c.name||'').trim().toUpperCase(), sede=NOMBRES_SEDE[nom];
        if(!sede&&String(c.createdTime||'')<hace(DIAS_NUEVAS))return;   // carpetas de piezas viejas: ya están registradas
        var q="'"+c.id+"' in parents and trashed=false and "+MEDIA+(sede?" and "+nuevas:'');
        trabajos.push(listar(q,'id,name,mimeType,createdTime').then(function(fs){
          return fs.map(function(f){return fila(f,sede?nom:c.name,'Listo',sede||'');});
        }).catch(function(){return [];}));
      });
      return Promise.all(trabajos).then(function(listas){return [].concat.apply([],listas);});
    });
  }
  window.GaleriaVivo={cargar:cargar};
})();
