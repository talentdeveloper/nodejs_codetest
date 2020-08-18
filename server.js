'use strict'
var request = require("request"); 
const dbConn = require('./config/db.config');

var error_count = 0;
var success_count = 0;
var fail_count = 0;
var total_count = 0;

function update_status(id, status, http_code){
    dbConn.query("update `status` set `status`=?, http_code=? where id=?", [status, http_code, id], function(err, res){
        if(err){
            console.log("*****" + err)
        }
    })
}

function get_status(site_url, ind, id){
    request(site_url, function(error, response, body) {
        if (error) {
            console.log(id + " => error:" + error + " ~ " + site_url)
            update_status(id, "ERROR", "ERROR")
            error_count++
        } else if( response.statusCode == 429 ) {
            console.log(id + ":" + response.statusCode + " => " + site_url)
            fail_count++
        } else {
            console.log(id + " => " + response.statusCode)
            update_status(id, "DONE", response.statusCode)
            success_count++
        }
    });
}



dbConn.query("select count(*) as cnt from `status` where `status` not like 'NEW'", function(err, res) {
    if(err){
        console.log(err)
        process.exit()
    }
    total_count = res[0].cnt
})

var segment = 10
var duration = 3000

var timmer = setInterval(() => {
    dbConn.query("select * from `status` where `status` like 'NEW' limit " + fail_count + ", " + segment, function(err, rows, fields){
        if(err){
            console.log(err)
            clearInterval(timmer)
            return
        } else {
            if(rows.length == 0 && fail_count == 0){
                clearInterval(timmer)
                return
            }
            rows.forEach((element, index) => {
                get_status(element.url, index, element.id)
                console.log(element.id)
            });
        }

        if(total_count > 0){
            if( fail_count > total_count - success_count ){
                console.log("*************************")
                console.log(fail_count + "---" + duration * 2)
                fail_count = 0
                duration = duration * 2
                if(duration > 30000){
                    console.log("Execute this program again.")
                    process.exit()
                }
            }
        }
    })    
}, duration);
