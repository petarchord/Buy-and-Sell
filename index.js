const express= require('express');
const exphbs=require('express-handlebars');
const cassandra=require('cassandra-driver');
const bodyParser=require('body-parser');
const methodOverride=require('method-override');
const path=require('path');
const Cookies =require('cookies');
const router=express.Router();


const port=3000;

var uname;
var products=[];

const app=express();

var client =new cassandra.Client({contactPoints:['127.0.0.1'],localDataCenter:'datacenter1'});
client.connect((err,result)=>{
    console.log('Cassandra connected...');
});




app.engine('handlebars',exphbs({defaultLayout:'main'}));
app.set('view engine','handlebars');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

app.use(methodOverride('_method'));

app.get('/',(req,res,next)=>{
    res.render('welcome');
});

app.get('/register',(req,res,next)=>{
    res.render('register');
});

app.get('/home',(req,res,next)=>{
    res.render('home',{
        username:uname

    });
});

app.get('/products',(req,res,next)=>{
    
    client.execute('SELECT * FROM project2.product',(err,result)=>{
        if(err)
        {
            res.status(404).send({msg: err});
        }
        else
        {
            
            console.log('Result.rows:'+result.rows);
            res.render('products',{
            username:uname,
            products:result.rows
            });
            
        }
    });
    
    
});

app.get('/myproducts',(req,res,next)=>{
    client.execute('SELECT * FROM project2.product WHERE userid = ? ALLOW FILTERING;',[uname],(err,result)=>{
        if(err)
        {
            res.status(404).send({msg: err});
        }
        else
        {
            res.render('myproducts',{
                username:uname,
                products:result.rows
            });
        }
    });

});

app.get('/editproduct/:id',(req,res,next)=>{
    var id=req.params.id;
    client.execute('SELECT * FROM project2.product WHERE id = ?',[id],(err,result)=>{
        if(err)
        {
            res.status(404).send({msg:err});
        }
        else
        {
                res.render('editproduct',{
                username:uname,
                product:result.rows[0]
                });

        }
    });

});

app.get('/userinfo/:username',(req,res,next)=>{
    client.execute('SELECT * FROM project2.user WHERE username = ? ',[req.params.username],(err,result)=>{
        if(err)
        {
            res.status(404).send({msg:err});
        }
        else
        {
            res.render('userinfo',{
                user:result.rows[0]
            });
        }

    });
});


app.get('/addproduct',(req,res,next)=>{
    res.render('addproduct',{
        username:uname
    });

});


app.get('/home/about',(req,res,next)=>{
    res.render('about',{
        username:uname

    });
});


app.get('/myproducts/delete/:id',(req,res,next)=>{

    client.execute('DELETE FROM project2.product WHERE id = ?',[req.params.id],(err,result)=>{
        if(err)
        {
            res.status(404).send({msg:err});
        }
        else
        {
            res.redirect('/myproducts');
        }
    });


});

var getUser='SELECT * FROM project2.user WHERE username = ?';
var insertUser='INSERT INTO project2.user(username,password,f_name,l_name,email) VALUES(?,?,?,?,?)';
//sign in and register processing 
app.post('/home',(req,res,next)=>{
        if(req.body.register =='some')
    {
        //request comes from register form
        
        if(!req.body.uname || !req.body.passw || !req.body.passw2)
{
    res.render('register', {
        error: 'You have to enter all fields in order to create an account!'
    });
    return;
}

    if(req.body.passw != req.body.passw2)
{
        res.render('register', {
        error: 'You have to enter the same password in both fields!'
    });
    return;
        
}

    uname=req.body.uname;
    var passw=req.body.passw;
    var name=req.body.name;
    var lname=req.body.lname;
    var email=req.body.email;
    client.execute(getUser,[uname],(err,result)=>{
        console.log('result:'+result.rows[0]);
        if(result.rows[0])
        {
            res.render('register',{
                error:'This username is already in use ,try another one.'
            });
            return;
        }
        else
        {
            client.execute(insertUser,[req.body.uname,req.body.passw,req.body.name,req.body.lname,req.body.email],(err,result)=>{
                if(err)
                {
                    res.status(404).send({msg: err});
                }
                else
                {
                    res.render('home',{
                        username:uname
                    });
                    return;
                }

            });


        }
    });
    /*
    client.hget('users',uname,(err,obj)=>{

        if(obj)
    {
            res.render('register', {
            error: 'The username is already in use, try another one!'
        });
        return;

    }
    
    else
    {
        client.INCR('next_user_id', (err,objid) => {
           var auth = new Buffer(uname + ':' + passw).toString('base64'); 
           console.log(auth);
           if(!client.hset('users',uname,objid))
           console.log('Failure during the db write in users');
           if(!client.hset('user:'+objid,'username',uname) || 
           !client.hset('user:'+objid,'password',passw) || !client.hset('user:'+objid,'auth',auth))
           console.log('Failure during the db write in user');
           res.render('home',{
               username:uname
           });
           return;
           

        });
    }

    }); */
   


}
//request comes from welcome form
else if(req.body.username.toString()=='admin' && req.body.password.toString()=='admin123')
{
    res.render('admin', {
        username:'admin'
    });
    return;

}
else
{
    
    if(!req.body.username || !req.body.password)
    {
    res.render('welcome', {
        error: 'You have to enter both , the username and password!'
    });
    return;
    }
    uname=req.body.username;
    var password=req.body.password;
    client.execute(getUser,[req.body.username],(err,result)=>{
        if(err)
        {
            res.render('welcome',{
                error: 'Wrong username or password!'
            });
            return;
        }
        else
        {
            if(result.rows[0].password == password)
            {
                res.render('home',{
                    username:uname
                });
            }
            else
            {
                res.render('welcome',{
                error: 'Wrong username or password!'
            });
            return;
                
            }

        }
    });
    /*
    client.hget('users',username,(err,obj1)=>{

        
        if(!obj1)
        {
            res.render('welcome', {
                error: 'Wrong username or password!'
            });
        }
        else
        {
            client.hget('user:'+obj1,'password',(err,obj2)=>{
                if(obj2 != password)
                {
                    res.render('welcome', {
                        error:'Wrong username or password!'
                    });
                }
                else
                {
                        
                     var cookies=new Cookies(req,res);
                     client.hget('user:'+obj1,'auth',(err,objauth)=>{
                         cookies.set('auth',objauth);
                         
                     });
                     temp=username;
                     res.render('home',{
                     username:username
            });
                     console.log('The content of the cookie:'+cookies.get('auth'));
                }
            })
        }
    }) */
           
}
    

});

app.post('/myproducts',(req,res,next)=>{

    if(req.body.hidden == 'addproduct')
    {
        //request comes from addproduct form
        var id=cassandra.types.uuid();
        console.log('Generated id:'+id);
        client.execute('INSERT INTO project2.product(id,userid,name,type,descr,price,phone) VALUES(?,?,?,?,?,?,?);',[id,req.body.userid,req.body.name,req.body.type,req.body.descr,req.body.price,req.body.phone],(err,result)=>{

            if(err)
            {
                res.status(404).send({msg:err});
            }
            else
            {
                res.redirect('/myproducts');
            }



        });
    }
    else
    {
        client.execute('INSERT INTO project2.product(id,userid,name,type,descr,price,phone) VALUES(?,?,?,?,?,?,?);',[req.body.id,req.body.userid,req.body.name,req.body.type,req.body.descr,req.body.price ,req.body.phone],(err,result)=>{
        if(err)
        {
            res.status(404).send({msg:err});
        }
        else
        {
            res.redirect('/myproducts');
        }

    });

    }

});






app.listen(port,() => {
    console.log(`Listening on port ${port} ...`);
});