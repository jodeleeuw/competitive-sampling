var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://perceptsconcepts.psych.indiana.edu:27017/test';
MongoClient.connect(url, function(err, db){
  console.log(err);
  if(err !== null){
    db.collection('teams').insertOne({field: 'value1'});
    console.log('MongoDB connection successful!');
    db.close();
  } else {
    console.log('connection to mongodb failed');
  }
})



/*var db_config = require('./db-config.json');

var connection = mysql.createConnection({
  host: db_config.host,
  user: db_config.user,
  password: db_config.password,
  database: db_config.database
});

module.exports = {

  write: function(q){
    var table = q.table;
    var data = q.data;
    connection.connect(function(err){
      if(err){
        console.error('error connecting ' + err.stack);
        return;
      } else {
        console.log('connected as id ' + connection.threadId);
      }
    });
    if(!Array.isArray(data)) {
      data = [data];
    }
    for(var i=0; i<data.length; i++){
      connection.query('INSERT INTO ?? SET ?', [table, data], function(err, result){});
    }
    connection.end();
  }
}
*/
