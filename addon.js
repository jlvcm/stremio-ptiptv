const { addonBuilder } = require("stremio-addon-sdk");
var request = require('request');
const fs = require('fs');
/*
        const meta = {
            id: 'tt1254207',
            name: 'Big Buck Bunny',
            year: 2008,
            poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/uVEFQvFMMsg4e6yb03xOfVsDz4o.jpg',
            posterShape: 'regular',
            banner: 'https://image.tmdb.org/t/p/original/aHLST0g8sOE1ixCxRDgM35SKwwp.jpg',
            type: 'movie'
		}
	*/
// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
	"id": "community.ptiptv",
	"version": "0.0.1",
	"catalogs": [{'type':'tv','id':'ptiptv','name':'ptiptv'}],
	"resources": ["catalog", "meta", "stream"],
	"types": ['tv'],
	"name": "ptiptv",
	"description": "ptiptv",
//	"idPrefixes": ["pttv:"]
}
function match(r,s,i){
	var m = s.match(r);
	return (m && m.length>i)?m[i]:''
}

const builder = new addonBuilder(manifest)
function getData(){
	return new Promise((resolve, reject) => {
		fs.readFile('lista.m3u8', "utf8", (err, data) => {
			var channels = data.replace('#EXTM3U url-tvg="https://ptiptv.tk/guia.xml"\n#', '').split('#');
			var metas = [];
			for (let i = 0; i < channels.length; i++) {
				const item = channels[i];
				var name = match(/,([^\n]+)/,item,1);
				if(!name) continue;
				var img = match(/tvg-logo="([^"]+)"/,item,1);
				metas.push({
					id:'pttv:'+i,
					name:name,
					poster:img,
					posterShape: 'regular',
					type:'tv',
				})
			}
			resolve(metas);
		});
	});
}

function getOne(id){
	return new Promise((resolve, reject) => {
		fs.readFile('lista.m3u8', "utf8", (err, data) => {
			var channels = data.replace('#EXTM3U url-tvg="https://ptiptv.tk/guia.xml"\n#', '').split('#');
			const item = channels[id];
			var name = match(/,([^\n]+)/,item,1);
			var img = match(/tvg-logo="([^"]+)"/,item,1);
			var group = match(/group-title="([^"]+)"/,item,1);
			var stream = match(/\n(http[^\n]+)/,item,1).trim();
			resolve({
				'name':name,
				'img':img,
				'stream':stream,
				'group':group
			});
		});
	});
}


// 
builder.defineCatalogHandler(function(args, cb) {
	// filter the dataset object and only take the requested type
	return new Promise((resolve, reject) => {
		getData().then(function(values) {
			resolve({'metas':values});
		});
	});
});

// takes function(args, cb)
builder.defineStreamHandler(function(args, cb) {
	if (args.type === 'tv' && args.id.startsWith('pttv:')) {
		return new Promise((resolve, reject) => {
			getOne(args.id.split(':')[1]).then(function(values) {
				var data = values;
				const stream = { url: data['stream'] }
				resolve({ streams: [stream] })
			});
		});
    } else {
        // otherwise return no streams
        return Promise.resolve({ streams: [] })
    }
})
builder.defineMetaHandler(function(args) {
		if (args.type === 'tv' && args.id.startsWith('pttv:')) {
			return new Promise((resolve, reject) => {
				getOne(args.id.split(':')[1]).then(function(values) {
					data = values;
					resolve({ meta: {
						id:args.id,
						name:data['name'],
						poster:data['img'],
						logo:data['img'],
						//background:data['img'],
						posterShape: 'regular',
						type:'tv'
					} })
					
				});
			});
		} else {
			// otherwise return no meta
			return Promise.resolve({ meta: {} })
		}

})
module.exports = builder.getInterface()