var array = {};
for (var key in json){
  array[key] = {};
  var arrayLength = json[key].length;
  for (var i = 0; i < arrayLength; i++){
    var district = json[key][i]['district'];
    array[key][district] = [];
}
  for (var i = 0; i < arrayLength; i++){
    var candidate = 
      {'name': json[key][i]["clean_name"],
      'party': json[key][i]["party"],
      'branch': json[key][i]["branch"],
      'url': json[key][i]["url"]
      };
      array[key][json[key][i]['district']].push(candidate);
}
}
var text = JSON.stringify(array);
console.log(text);
fs.writeFile("candidates_clean.json", text, function(err){
if (err) throw err;
 console.log("success");
}); 