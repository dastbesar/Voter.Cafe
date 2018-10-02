var fs = require('fs');
var request = require("request");
var cheerio = require("cheerio");
var jsonFile = JSON.parse(fs.readFileSync(__dirname + "/public/data/candidates.json"));

var c = 0;

var array = { "AL": {
    "count": "7",
    "name": "Alabama",
    "abbr": "AL"
},
"AK": {
    "count": "0",
    "name": "Alaska",
    "abbr": "AK"
},
"AZ": {
    "count": "9",
    "name": "Arizona",
    "abbr": "AZ"
},
"AR": {
    "count": "4",
    "name": "Arkansas",
    "abbr": "AR"
},
"CA": {
    "count": "53",
    "name": "California",
    "abbr": "CA"
},
"CO": {
    "count": "7",
    "name": "Colorado",
    "abbr": "CO"
},
"CT": {
    "count": "5",
    "name": "Connecticut",
    "abbr": "CT"
},
"DE": {
    "count": "0",
    "name": "Delaware",
    "abbr": "DE"
},
"FL": {
    "count": "27",
    "name": "Florida",
    "abbr": "FL"
},
"GA": {
    "count": "14",
    "name": "Georgia",
    "abbr": "GA"
},
"HI": {
    "count": "2",
    "name": "Hawaii",
    "abbr": "HI"
},
"ID": {
    "count": "2",
    "name": "Idaho",
    "abbr": "ID"
},
"IL": {
    "count": "18",
    "name": "Illinois",
    "abbr": "IL"
},
"IN": {
    "count": "9",
    "name": "Indiana",
    "abbr": "IN"
},
"IA": {
    "count": "4",
    "name": "Iowa",
    "abbr": "IA"
},
"KS": {
    "count": "4",
    "name": "Kansas",
    "abbr": "KS"
},
"KY": {
    "count": "6",
    "name": "Kentucky",
    "abbr": "KY"
},
"LA": {
    "count": "6",
    "name": "Louisiana",
    "abbr": "LA"
},
"ME": {
    "count": "2",
    "name": "Maine",
    "abbr": "ME"
},
"MD": {
    "count": "8",
    "name": "Maryland",
    "abbr": "MD"
},
"MA": {
    "count": "9",
    "name": "Massachusetts",
    "abbr": "MA"
},
"MI": {
    "count": "14",
    "name": "Michigan",
    "abbr": "MI"
},
"MN": {
    "count": "8",
    "name": "Minnesota",
    "abbr": "MN"
},
"MS": {
    "count": "4",
    "name": "Mississippi",
    "abbr": "MS"
},
"MO": {
    "count": "8",
    "name": "Missouri",
    "abbr": "MO"
},
"MT": {
    "count": "0",
    "name": "Montana",
    "abbr": "MT"
},
"NE": {
    "count": "3",
    "name": "Nebraska",
    "abbr": "NE"
},
"NV": {
    "count": "4",
    "name": "Nevada",
    "abbr": "NV"
},
"NH": {
    "count": "2",
    "name": "New Hampshire",
    "abbr": "NH"
},
"NJ": {
    "count": "12",
    "name": "New Jersey",
    "abbr": "NJ"
},
"NM": {
    "count": "3",
    "name": "New Mexico",
    "abbr": "NM"
},
"NY": {
    "count": "27",
    "name": "New York",
    "abbr": "NY"
},
"NC": {
    "count": "13",
    "name": "North Carolina",
    "abbr": "NC"
},
"ND": {
    "count": "0",
    "name": "North Dakota",
    "abbr": "ND"
},
"OH": {
    "count": "16",
    "name": "Ohio",
    "abbr": "OH"
},
"OK": {
    "count": "5",
    "name": "Oklahoma",
    "abbr": "OK"
},
"OR": {
    "count": "5",
    "name": "Oregon",
    "abbr": "OR"
},
"PA": {
    "count": "18",
    "name": "Pennsylvania",
    "abbr": "PA"
},
"RI": {
    "count": "2",
    "name": "Rhode Island",
    "abbr": "RI"
},
"SC": {
    "count": "7",
    "name": "South Carolina",
    "abbr": "SC"
},
"SD": {
    "count": "0",
    "name": "South Dakota",
    "abbr": "SD"
},
"TN": {
    "count": "9",
    "name": "Tennessee",
    "abbr": "TN"
},
"TX": {
    "count": "36",
    "name": "Texas",
    "abbr": "TX"
},
"UT": {
    "count": "4",
    "name": "Utah",
    "abbr": "UT"
},
"VT": {
    "count": "0",
    "name": "Vermont",
    "abbr": "VT"
},
"VA": {
    "count": "11",
    "name": "Virginia",
    "abbr": "VA"
},
"WA": {
    "count": "10",
    "name": "Washington",
    "abbr": "WA"
},
"WV": {
    "count": "3",
    "name": "West Virginia",
    "abbr": "WV"
},
"WI": {
    "count": "8",
    "name": "Wisconsin",
    "abbr": "WI"
},
"WY": {
    "count": "0",
    "name": "Wyoming",
    "abbr": "WY"
}
};


var object = {};

async function y (){

for (k in array){
    var stateFull = array[k]['name'];
    c++;
    object[k] = {
        'Senate': {},
        'House': {}
    };
    if (array[k]['count'] !== '0'){
        var count = array[k]['count'];
        for (var i = 1; i <= count; i++){
            var num = ordinal_suffix_of(i);
            var term = stateFull + "'s " + num;
            await Promise.all([getsenate (stateFull, k),gethouse (term)]);
            if (c == 50) {
                fs.writeFileSync("../server/public/data/candidates.json", JSON.stringify(object));
            }
        }
}
}

}


function getsenate (stateFull, k){
    return new Promise((resolve, reject) => {
        request('https://ballotpedia.org/United_States_Senate_election_in_' + stateFull + ', 2018', (error, response, html) => {
              var $ = cheerio.load(html);
              var x = $('.bptable.sortable tr').length;
              if (x == '0'){
                resolve();
              }
              else {
                for (i = 1; i < x-1; i++){
                    var name = $('.bptable.sortable tr').eq(i).find("td").eq(0).text()
                    if (!(name in object[k]['Senate'])){
                        object[k]['Senate'][name] = {};
                    }
                }
                resolve();
              }
    });
    });
}

function gethouse (term){
            return new Promise((resolve, reject) => {
                    url = 'https://ballotpedia.org/' + term + ' Congressional District election, 2018';
                    request(url, (error, response, html) => {
                            const $ = cheerio.load(html);
                            var x = $('.bptable.sortable tr').length;
                            for (i = 1; i < x-1; i++){
                                var num = i.toString();
                                object[k]['House'][num] = {};
                                var name = $('.bptable.sortable tr').eq(i).find("td").eq(0).text();
                                if (!(name in object[k]['House'][num])){
                                    object[k]['House'][num][name] = {};
                                    console.log(object);
                                }
                            }
                            resolve();
                });
            });
};

function ordinal_suffix_of(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

y();