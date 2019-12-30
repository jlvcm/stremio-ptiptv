// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
// M3u from https://github.com/iptv-org/iptv

const { addonBuilder } = require("stremio-addon-sdk");
var request = require('request');

countries = {'Afghanistan':'af','Albania':'al','Algeria':'dz','Andorra':'ad','Angola':'ao','Argentina':'ar','Armenia':'am','Aruba':'aw','Australia':'au','Austria':'at','Azerbaijan':'az','Bahamas':'bs','Bahrain':'bh','Bangladesh':'bd','Barbados':'bb','Belarus':'by','Belgium':'be','Bolivia':'bo','Bosnia and Herzegovina':'ba','Brazil':'br','Brunei':'bn','Bulgaria':'bg','Burkina Faso':'bf','Cambodia':'kh','Cameroon':'cm','Canada':'ca','Cape Verde':'cv','Chile':'cl','China':'cn','Colombia':'co','Costa Rica':'cr','Croatia':'hr','Curaçao':'cw','Cyprus':'cy','Czech Republic':'cz','Democratic Republic of the Congo':'cd','Denmark':'dk','Dominican Republic':'do','Ecuador':'ec','Egypt':'eg','El Salvador':'sv','Equatorial Guinea':'gq','Estonia':'ee','Ethiopia':'et','Faroe Islands':'fo','Finland':'fi','Fiji':'fj','France':'fr','Gambia':'gm','Georgia':'ge','Germany':'de','Ghana':'gh','Greece':'gr','Grenada':'gd','Guadeloupe':'gp','Guatemala':'gt','Guyana':'gy','Haiti':'ht','Honduras':'hn','Hong Kong':'hk','Hungary':'hu','Iceland':'is','India':'in','Indonesia':'id','International':'int','Iran':'ir','Iraq':'iq','Ireland':'ie','Israel':'il','Italy':'it','Ivory Coast':'ci','Jamaica':'jm','Japan':'jp','Jordan':'jo','Kazakhstan':'kz','Kenya':'ke','Kosovo':'xk','Kuwait':'kw','Kyrgyzstan':'kg','Laos':'la','Latvia':'lv','Lebanon':'lb','Libya':'ly','Liechtenstein':'li','Lithuania':'lt','Luxembourg':'lu','Macau':'mo','Malaysia':'my','Maldives':'mv','Malta':'mt','Mexico':'mx','Moldova':'md','Mongolia':'mn','Montenegro':'me','Morocco':'ma','Mozambique':'mz','Myanmar':'mm','Nepal':'np','Netherlands':'nl','New Zealand':'nz','Nicaragua':'ni','Nigeria':'ng','North Korea':'kp','North Macedonia':'mk','Norway':'no','Oman':'om','Pakistan':'pk','Palestine':'ps','Panama':'pa','Paraguay':'py','Peru':'pe','Philippines':'ph','Poland':'pl','Portugal':'pt','Puerto Rico':'pr','Qatar':'qa','Republic of the Congo':'cg','Romania':'ro','Russia':'ru','Rwanda':'rw','Saint Kitts and Nevis':'kn','San Marino':'sm','Saudi Arabia':'sa','Senegal':'sn','Serbia':'rs','Sierra Leone':'sl','Singapore':'sg','Sint Maarten':'sx','Slovakia':'sk','Slovenia':'si','Somalia':'so','South Africa':'za','South Korea':'kr','Spain':'es','Sri Lanka':'lk','Sudan':'sd','Sweden':'se','Switzerland':'ch','Syria':'sy','Taiwan':'tw','Tanzania':'tz','Thailand':'th','Togo':'tg','Trinidad and Tobago':'tt','Tunisia':'tn','Turkey':'tr','Turkmenistan':'tm','Uganda':'ug','Ukraine':'ua','United Arab Emirates':'ae','United Kingdom':'uk','United States':'us','Uruguay':'uy','Venezuela':'ve','Vietnam':'vn','Virgin Islands of the United States':'vi','Western Sahara':'eh','Yemen':'ye','Zimbabwe':'zw'}

const oneDay = 24 * 60 * 60 // in seconds

const cache = {
	maxAge: 1.5 * oneDay, // 1.5 days
	staleError: 6 * 30 * oneDay // 6 months
}

const manifest = {
	id: "community.iptvOrg",
	version: "0.0.2",
	catalogs: [{type:'tv',id:'iptvOrg',name:'iptvOrg',extra: [
		{
		  name: "genre",
		  options: Object.keys(countries),
		  isRequired: true
		}
	  ]}],
	resources: ["catalog", "meta", "stream"],
	types: ['tv'],
	name: "iptvOrg",
	description: "Collection of 8000+ publicly available IPTV channels from all over the world.",
	idPrefixes: ['iptvorg']
}
function match(r,s,i){
	var m = s.match(r);
	return (m && m.length>i)?m[i]:''
}

const builder = new addonBuilder(manifest)
function getData(country){
	if(!country) country='United States';
	return new Promise((resolve, reject) => {
		request('https://iptv-org.github.io/iptv/countries/'+countries[country]+'.m3u', function (error, response, body) {
			if(error){
				reject(error);
			}else if (!response || response.statusCode!=200 ){
				reject(response.statusCode);
			}else if (body){
				var channels = body.split('#');
				var metas = [];
				var metaID = {};
				for (let i = 1; i < channels.length; i++) {
					const item = channels[i];
					var name = match(/,([^\n]+)/,item,1).trim();
					if(!name) continue;
					var img = match(/tvg-logo="([^"]+)"/,item,1);
					var stream = match(/\n(http[^\n]+)/,item,1).trim();
					var id ='iptvorg:'+country+'::'+name;
					if(metaID[id]==undefined){
						metaID[id] = metas.length;
						metas.push({
							id:id,
							name:name,
							logo:img,
							poster:img,
							posterShape: 'regular',
							type:'tv',
							streams:[]
						});
						metas[metaID[id]] = metas[metaID[id]]
					}
					metas[metaID[id]].streams.push({
						'url':stream,
					});
				}
				resolve(metas);
			}
		
		});
	});
}


// 
builder.defineCatalogHandler(function(args, cb) {
	// filter the dataset object and only take the requested type
	return new Promise((resolve, reject) => {
		getData(args.extra.genre).then(function(values) {
			resolve({
				metas:values,
				cacheMaxAge: cache.maxAge,
				staleError: cache.staleError
			});
		}).catch((e)=>{
			reject(e);
		});
	});
});

// takes function(args, cb)
builder.defineStreamHandler(function(args, cb) {
	if (args.type === 'tv' && args.id.startsWith('iptvorg:')) {
		return new Promise((resolve, reject) => {
			genr = args.id.split(':',2)[1].split('::')[0];
			getData(genr).then(function(values) {
				for (let i = 0; i < values.length; i++) {
					if(values[i].id == args.id){
						return resolve({
							streams:values[i].streams,
							cacheMaxAge: cache.maxAge,
							staleError: cache.staleError
						});
					}
				}
				resolve({ streams: [] });
			}).catch((e)=>{
				reject(e);
			});
		});
    } else {
        // otherwise return no streams
        return Promise.resolve({ streams: [] })
    }
})

builder.defineMetaHandler(function(args) {
	if (args.type === 'tv' && args.id.startsWith('iptvorg:')) {
		return new Promise((resolve, reject) => {
			genr = args.id.split(':',2)[1].split('::')[0];
			getData(genr).then(function(values) {
				for (let i = 0; i < values.length; i++) {
					if(values[i].id == args.id){
						return resolve({
							meta:values[i],
							cacheMaxAge: cache.maxAge,
							staleError: cache.staleError});
					}
				}
				resolve({ streams: [] })
			}).catch((e)=>{
				reject(e);
			});
		});
    } else {
        // otherwise return no streams
        return Promise.resolve({ streams: [] })
    }

})
module.exports = builder.getInterface()