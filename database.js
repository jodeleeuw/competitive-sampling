var MongoClient = require('mongodb').MongoClient;
var db_config = require('./db-config.json');

var url = 'mongodb://'+db_config.host+'/'+db_config.database;

module.exports = {

  write: function(q){
    var collection = q.collection;
    var data = q.data;
    if(!Array.isArray(data)) {
      data = [data];
    }

    MongoClient.connect(url, function(err, db){
      if(err == null){
        db.collection(collection).insertMany(data);
        db.close();
      } else {
        console.log('connection to mongodb failed');
      }
    })
  }
}
