#sub.R



var RInput = deployr.RInput;

deployr.script('/testuser/root/add.R')
   .numeric('x', 10)  
   .numeric('y', 20)
   .routput('result')
   .end(function(res) {
     var sum = res.get('workspace').value.objects[0].value;
   	 console.log(sum);
     return { rinput: RInput.integer('sum', sum) };
   })
   .script('/testuser/root/mul.R')
   .numeric('x', 5)  
   .routput('result')
   .end(function(res) {
   	console.log(res);
   	  console.log(res.workspace('result'));
   	 //var sum = res.get('workspace').value.objects[0].value;
   	 //console.log(sum);
   })/*
   .script('/testuser/root/mul.R')
   .numeric('x', 10)  
   .robjects('result')
   .end(function(res) {
     var rinputs = [
        res.get('workspace')
     ];
   });*/







//deployr.code(code, {})


/*

deployr.script({ filename: 'DeployR - Hello World', author: 'testuser'})
   .numeric('input_randomNum', 10)  
   .end()
   .rplot('el-id');


  deployr.script({ filename: 'DeployR - Hello World', author: 'testuser'})
   .numeric('input_randomNum', 10)    
   .rplot('el-id');   


var req = $("#plotdiv").rplot("smoothplot", {
    ticker : ticker,
    from : "2013-01-01"
})  

*/


