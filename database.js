var mysql = require('mysql');
var db_config = require('./db-config.json');

module.exports = {

  connection: mysql.createConnection({
    host: db_config.host,
    user: db_config.user,
    password: db_config.password,
    database: db_config.database
  }),

  write: function(q){
    var table = q.table;
    var data = q.data;
    this.connection.connect(function(err){
      if(err){
        console.error('error connecting ' + err.stack);
        return;
      } else {
        console.log('connected as id ' + this.connection.threadId);
      }
    });
    if(!Array.isArray(data)) {
      data = [data];
    }
    for(var i=0; i<data.length; i++){
      this.connection.query('INSERT INTO ?? SET ?', [table, data], function(err, result){});
    }
    this.connection.end();
  }
}
