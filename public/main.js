var request = require("request");
var gis = require("g-i-s");
var fs = require("fs");
var cheerio = require("cheerio");
var Fuse = require("fuse.js");
const GoogleNewsRss = require("google-news-rss");
var he = require("he");
var wtf = require("wtf_wikipedia");

const googleNews = new GoogleNewsRss();

var jsonFile = JSON.parse(fs.readFileSync(__dirname + "/data/codes.json"));
var candidateFile = JSON.parse(
  fs.readFileSync(__dirname + "/data/candidates_clean.json")
);

var district;
var state;
var zip;
var stateFull;

exports.wrapper = async function wrappper(address) {
  exports.object = {
    district_info: {},
    House: {},
    Senate: {}
  };
  try {
    let one = await exports.begin(address);
    let two = await Promise.all([getCurrentReps(), getCandidates()]);
    let three = await exports.basicInfo(exports.object);
    exports.object["district"] = district;
    exports.object["state"] = state;
    exports.object["state_full"] = stateFull;
    return exports.object;
  } catch (err) {
    console.log(err);
    return false;
  }
};

exports.begin = function begin(address) {
  zip = address["zipcode"];
  stateFull = address["state"];
  return new Promise((resolve, reject) => {
    request.get(
      "https://geocoding.geo.census.gov/geocoder/geographies/address?street=" +
        address["street"] +
        "&city=" +
        address["city"] +
        "&state=" +
        address["state"] +
        "&zip=" +
        address["zipcode"] +
        "&benchmark=4&vintage=4&format=json&layers=54",
      function(err, res) {
        var result = JSON.parse(res.body);
        var match = result.result.addressMatches[0];
        if (err || match === undefined) {
          reject(err);
        } else {
          district =
            result.result.addressMatches[0].geographies[
              "116th Congressional Districts"
            ][0]["CD116"];
          if (district.charAt(0) == "0") {
            district = district.slice(1);
          }
          state = result.result.addressMatches[0].addressComponents.state;
          resolve();
        }
      }
    );
  });
};

exports.basicInfo = async function basicInfo(object) {
  var obj = jsonFile[state];
  var options = {
    threshold: 0.6,
    keys: ["Name"]
  };
  var fuse = new Fuse(obj, options);
  var x =
    Object.keys(object["House"]).length + Object.keys(object["Senate"]).length;
  var i = 0;
  return new Promise((resolve, reject) => {
    for (var key in object) {
      if (key !== "district_info") {
        names = object[key];
        for (var k in names) {
          var test = fuse.search(k);
          object[key][k]["cid"] = test[0]["CID"];
          object[key][k]["FECCandID"] = test[0]["FECCandID"];
          var name1 = test[0]["Name"];
          var name2 = k;
          Promise.all([
            exports.getCandSummary(test[0]["FECCandID"]),
            exports.img(test[0]["Name"], stateFull),
            name1,
            name2
          ]).then(function(values) {
            var array = JSON.parse(values[0]);
            var key = array["results"][0]["office_full"];
            var name1 = values[2];
            var name2 = values[3];
            object[key][name2]["name"] = name1;
            object[key][name2]["office"] = array["results"][0]["office_full"];
            object[key][name2]["party"] = array["results"][0]["party_full"];
            object[key][name2]["status"] =
              array["results"][0]["incumbent_challenge_full"];
            object[key][name2]["img"] = values[1][0];
            i++;
            if (i == x) {
              resolve();
            }
          });
        }
      }
    }
  });
};

exports.getCandSummary = function getCandSummary(id) {
  return new Promise((resolve, reject) => {
    request.get(
      {
        url:
          "https://api.open.fec.gov/v1/candidates/?api_key=dD2oeefcjS04AZfYFozUG3hzd1LvndFBZg4vVqYU",
        qs: {
          candidate_id: id
        }
      },
      function(err, res) {
        resolve(res.body);
        if (err) {
          reject(err);
        }
      }
    );
  });
};

function getCandidates() {
  var data = candidateFile[state];
  for (var i = 0; i < data[district].length; i++) {
    var name = data[district][i]["name"];
    exports.object["House"][name] = {
      party: candidateFile[state][district][i]["party"],
      url: candidateFile[state][district][i]["url"]
    };
  }
  for (var i = 0; i < candidateFile[state]["0"].length; i++) {
    if (candidateFile[state]["0"][i]["branch"] == "S") {
      var name = candidateFile[state]["0"][i]["name"];
      exports.object["Senate"][name] = {
        party: candidateFile[state]["0"][i]["party"],
        url: candidateFile[state]["0"][i]["url"]
      };
    } else if (candidateFile[state]["0"][i]["branch"] == "H") {
      var name = candidateFile[state]["0"][i]["name"];
      exports.object["House"][name] = {
        party: candidateFile[state]["0"][i]["party"],
        url: candidateFile[state]["0"][i]["url"]
      };
    }
  }
}

function getCurrentReps() {
  return new Promise((resolve, reject) => {
    request.get(
      "https://whoismyrepresentative.com/getall_mems.php?&output=json&zip=" +
        zip,
      async function(err, res) {
        if (err) {
          reject(err);
          console.log(err);
        } else {
          var result = JSON.parse(res.body);
          exports.object.district_info["House"] = [];
          exports.object.district_info["Senate"] = [];
          for (var i = 0; i < result.results.length; i++) {
            if (result.results[i].district == "") {
              result.results[i]["img"] = await exports.img(
                result.results[i].name,
                stateFull
              );
              exports.object.district_info["Senate"].push(result.results[i]);
            }
            if (result.results[i].district == district) {
              result.results[i]["img"] = await exports.img(
                result.results[i].name,
                stateFull
              );
              exports.object.district_info["House"].push(result.results[i]);
            }
          }
          resolve();
        }
      }
    );
  });
}

exports.img = function img(name, stateFull) {
  return new Promise(async function(resolve, reject) {
    var searchterm = name + " " + stateFull + " Candidate";
    var opts = {
      searchTerm: searchterm,
      queryStringAddition: "&tbs=isz:l",
      filterOutDomains: ["lookaside.fbsbx.com", "facebook.com"]
    };
    gis(opts, function(error, results) {
      if (error) {
        reject(error);
        console.log(error);
      } else {
        resolve(results);
      }
    });
  });
};

exports.getContributers = function getContributers(cid) {
  return new Promise((resolve, reject) => {
    request.get(
      "https://www.opensecrets.org/api/?method=candContrib",
      {
        qs: {
          apikey: "1b363c8cff62089461fbca0e675bc387",
          cid: cid,
          cycle: "2018",
          output: "json"
        }
      },
      function(err, res) {
        if (err) {
          reject(err);

          console.log(err);
        } else {
          resolve(res.body);
        }
      }
    );
  });
};

exports.getindustries = function getindustries(cid) {
  return new Promise((resolve, reject) => {
    request.get(
      "https://www.opensecrets.org/api/?method=candIndustry",
      {
        qs: {
          apikey: "1b363c8cff62089461fbca0e675bc387",
          cid: cid,
          cycle: "2018",
          output: "json"
        }
      },
      function(err, res) {
        if (err) {
          reject(err);

          console.log(err);
        } else {
          resolve(res.body);
        }
      }
    );
  });
};

exports.getFinancialSummary = function getFinancialSummary(cid) {
  return new Promise((resolve, reject) => {
    request.get(
      "https://www.opensecrets.org/api/?method=candSummary",
      {
        qs: {
          apikey: "1b363c8cff62089461fbca0e675bc387",
          cid: cid,
          cycle: "2018",
          output: "json"
        }
      },
      function(err, res) {
        if (err) {
          reject(err);

          console.log(err);
        } else {
          resolve(res.body);
        }
      }
    );
  });
};

exports.getNews = function getNews(name) {
  return new Promise((resolve, reject) => {
    searchTerm = name;
    googleNews.search(searchTerm).then(resp => resolve(resp));
  });
};

exports.getWiki = async function getWiki(name) {
  var wikiInfo = {};
  var doc = await wtf.fetch(name);
  return new Promise(function(resolve, reject) {
    Promise.all([doc, exports.getInfoCard(name)]).then(function(values) {
      if (values[0]) {
        var description1 = values[0].sentences(0).text();
        var description2 = values[0].sentences(1).text();
        var description3 = values[0].sentences(2).text();
        wikiInfo = {
          description: description1 + " " + description2 + " " + description3,
          born: values[1]["born"],
          education: values[1]["education"],
          website: values[1]["website"]
        };
      } else {
        wikiInfo = {
          description: values[1]["born"],
          born: values[1]["born"],
          education: values[1]["education"],
          website: values[1]["website"]
        };
      }
      resolve(wikiInfo);
    });
  });
};

exports.getInfoCard = function getInfoCard(name) {
  var wikiInfo = {};
  return new Promise(function(resolve, reject) {
    url = "https://en.wikipedia.org/wiki/" + name;
    request(url, (error, response, html) => {
      const $ = cheerio.load(html);
      $(".infobox.vcard tr").each(function(i, elem) {
        var $tds = $(this)
          .find("th")
          .text();
        if ($tds === "Born") {
          var born = he.decode(
            $(this)
              .find("td")
              .html()
              .replace(/<(?:.|\n)*?>/gm, " ")
              .trim()
          );
          born = born.substring(born.indexOf(")  ") + 1);
          born = born.slice(0, born.indexOf(")") + 1).trim();
          wikiInfo["born"] = born;
        }
        if ($tds === "Education") {
          var education = he.decode(
            $(this)
              .find("td")
              .html()
              .replace(/<(?:.|\n)*?>/gm, " ")
              .trim()
          );
          wikiInfo["education"] = education;
        }
        if ($tds === "Website") {
          var website = $(this)
            .find("a")
            .attr("href");
          wikiInfo["website"] = website;
        }
      });
      resolve(wikiInfo);
      if (error) {
        resolve(error);
        console.log(error);
      }
    });
  });
};

exports.canInfo = async function canInfo(object) {
  var state = object["state"];
  var obj = jsonFile[state];
  var options = {
    threshold: 0.3,
    keys: ["Name"]
  };
  var options1 = {
    threshold: 0.4,
    keys: ["name"]
  };
  exports.candidateInfo = {};
  var fuse = new Fuse(obj, options);
  var cidsearch = fuse.search(object["name"]);
  if (cidsearch.length == "0") {
    return false;
  } else if (cidsearch.length !== "0") {
    var cid = cidsearch[0]["CID"];
    var name = cidsearch[0]["Name"];
    exports.candidateInfo["cid"] = cid;
    exports.candidateInfo["FECCandID"] = cidsearch[0]["FECCandID"];
    var values = await Promise.all([
      exports.getCandSummary(cidsearch[0]["FECCandID"]),
      exports.img(name, state),
      exports.getFinancialSummary(cid),
      exports.getContributers(cid),
      exports.getindustries(cid),
      exports.getNews(name),
      exports.getWiki(name)
    ]);
    var summary = JSON.parse(values[0]);
    var district = summary["results"][0]["district"];
    exports.candidateInfo["name"] = name;
    exports.candidateInfo["state"] = state;
    exports.candidateInfo["office"] = summary["results"][0]["office_full"];
    exports.candidateInfo["party"] = summary["results"][0]["party_full"];
    exports.candidateInfo["status"] =
      summary["results"][0]["incumbent_challenge_full"];
    exports.candidateInfo["img"] = values[1][0];
    if (summary["results"][0]["district"].charAt(0) == "0") {
      district = district.slice(1);
    }
    exports.candidateInfo["district"] = district;
    var data = candidateFile[state][district];
    var fuse1 = new Fuse(data, options1);
    var urlsearch = fuse1.search(name);
    exports.candidateInfo["url"] = urlsearch[0]["url"];
    if (values[2] == "Resource not found") {
      exports.candidateInfo["summary"] = "Not Found";
    }
    if (values[3] == "Resource not found") {
      exports.candidateInfo["top_contributers"] = "Not Found";
    }
    if (values[4] == "Resource not found") {
      exports.candidateInfo["top_industries"] = "Not Found";
    } else {
      var financial = JSON.parse(values[2]);
      var contributers = JSON.parse(values[3]);
      var industries = JSON.parse(values[4]);
      exports.candidateInfo["img"] = values[1][0];
      exports.candidateInfo["total"] =
        financial["response"]["summary"]["@attributes"]["total"];
      exports.candidateInfo["spent"] =
        financial["response"]["summary"]["@attributes"]["spent"];
      exports.candidateInfo["cash_on_hand"] =
        financial["response"]["summary"]["@attributes"]["cash_on_hand"];
      exports.candidateInfo["debt"] =
        financial["response"]["summary"]["@attributes"]["debt"];
      exports.candidateInfo["top_contributers"] =
        contributers["response"]["contributors"]["contributor"];
      exports.candidateInfo["top_industries"] =
        industries["response"]["industries"]["industry"];
      exports.candidateInfo["news"] = values[5];
      exports.candidateInfo["personal_details"] = values[6];
    }
    return exports.candidateInfo;
  }
};
function getIndID(org) {
  return new Promise((resolve, reject) => {
    request.get(
      "https://www.opensecrets.org/api/?method=getOrgs",
      {
        qs: {
          apikey: "1b363c8cff62089461fbca0e675bc387",
          org: org,
          output: "json"
        }
      },
      function(err, res) {
        if (err) {
          reject(err);

          console.log(err);
        } else {
          resolve(res.body);
        }
      }
    );
  });
}

function getIndData(id) {
  return new Promise((resolve, reject) => {
    request.get(
      "https://www.opensecrets.org/api/?method=orgSummary",
      {
        qs: {
          apikey: "1b363c8cff62089461fbca0e675bc387",
          id: id,
          output: "json"
        }
      },
      function(err, res) {
        if (err) {
          reject(err);

          console.log(err);
        } else {
          resolve(res.body);
        }
      }
    );
  });
}

exports.orginfo = async function orginfo(org) {
  try {
    let idQuery = await getIndID(org);
    if (
      idQuery == "Resource not found or query was less than three characters"
    ) {
      return false;
    } else {
      var query = JSON.parse(idQuery);
      query = query.response.organization;
      if (query.length > 0) {
        for (var i = 0; i < query.length; i++) {
          if (query[i]["@attributes"].orgname == org) {
            var orgID = query[i]["@attributes"].orgid;
          }
        }
      } else if (query.length == undefined) {
        var orgID = query["@attributes"].orgid;
      }
      var indData = await getIndData(orgID);
      return indData;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
};

// function getHouseCandidates() {
//   var stateDivision = stateFull + "'s " + division;
//   return new Promise(function(resolve, reject) {
//     url = 'https://ballotpedia.org/' + stateDivision + ' Congressional District election, 2018';
//   request(url, (error, response, html) => {

//     if(error){
//       reject(error);
//       console.log(error);
//     }
//     if(!error && response.statusCode == 200){
//           const $ = cheerio.load(html);
//           var initial = $("span[id*=Campaign_][class*='mw-headline']" ).parent().next().next().find('tr');
//           var x = initial.length;
//           for (i = 1; i < x-1; i++){
//               var name = initial.eq(i).find("td").eq(0).text();
//               exports.object['House'][name] = {};
//           }
//           resolve();
//         }
//   });
// });
// }

// function getSenateCandidates() {
//   return new Promise(function(resolve, reject) {
//     url = 'https://ballotpedia.org/United_States_Senate_election_in_' + stateFull + ', 2018';
//   request(url, (error, response, html) => {
//       if(!error && response.statusCode == 200){
//           const $ = cheerio.load(html);
//           var x = $('.bptable.sortable tr').length;
//           for (i = 1; i < x-1; i++){
//               var name = $('.bptable.sortable tr').eq(i).find("td").eq(0).text()
//               exports.object['Senate'][name] = {};
//           }
//           resolve();
//       }
//       if(error){
//         reject(error);

//         console.log(error);
//       }
//   });
// });
// }
