// Package for .env variables
require('dotenv').config()

//Requiring all the packages
const express = require("express");
const expressForm = require("express-formidable")
const mongoose = require("mongoose");
require('mongoose-type-url');
const ejs = require("ejs");
const bcrypt = require('bcrypt');

const AdminBro = require('admin-bro')
const AdminBroExpress = require('admin-bro-expressjs')

// We have to tell AdminBro that we will manage mongoose resources with it
AdminBro.registerAdapter(require('admin-bro-mongoose'))

//Initializing express
const app = express();

//Make a folder called public to pass required documents like styles.css
app.use(express.static("public"));

//Make a file called view for ejs to access
app.set('view engine', 'ejs');


mongoose.connect("mongodb+srv://admin-amrutha:"+process.env.ATLAS_PWD+"@mycluster.0amg5.mongodb.net/portfolio?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//REQUIRED SCHEMAS
const profileSchema = mongoose.Schema({
  name: String,
  dob: Date,
  about: String
})
const Profile = mongoose.model('Profile', profileSchema)

const Education = mongoose.model('Education', {
  qualification: {
    type: String,
    enum: ['Post-Graduation', 'Undergraduate', 'Class 12', 'Class10']
  },
  institution: String,
  type: {
    type: String,
    enum: ['Specialisation', 'Board']
  },
  spec: String
})

const Language = mongoose.model('Language', {
  language: String,
  proficiency: {
    type: String,
    enum: ['Elementary Proficiency', 'Limited Working Proficiency', 'Professional Working Proficiency', 'Full Professional Proficiency', 'Native/Bilingual Proficiency']
  }
})

const Abilities = mongoose.model('Abilities', {
  type: String,
  skill: String,
  proficiency: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
})

const Certificates = mongoose.model('Certificates', {
  title: String,
  Id: String,
  About: String
})

const Experience = mongoose.model('Experience', {
  type: String,
  titleposition: String,
  startdate: Date,
  enddate: Date,
  about: String,
})

const Projects = mongoose.model('Projects', {
  title: String,
  about: String,
  certificate: String,
  link: mongoose.SchemaTypes.Url
})




app.get("/", function(req, res) {
  Profile.find({
    "name": {
      $ne: null
    }
  }, function(err, foundProfile) {
    if (err) console.log(err);
    else {
      if (foundProfile) {
        // CALCULATE MY CURRENT AGE
        function calculate_age(birth_month, birth_day, birth_year) {
          today_date = new Date();
          today_year = today_date.getFullYear();
          today_month = today_date.getMonth();
          today_day = today_date.getDate();
          age = today_year - birth_year;

          if (today_month < (birth_month - 1)) {
            age--;
          }
          if (((birth_month - 1) == today_month) && (today_day < birth_day)) {
            age--;
          }
          return age;
        }
        const myAge = calculate_age(1, 19, 2000);
        Education.find({
          "qualification": {
            $ne: null
          }
        }, function(err, info) {
          if (err) console.log(err);
          else {
            if (info) {
              Language.find({
                "language": {
                  $ne: null
                }
              }, function(err, language) {
                if (err) console.log(err);
                else {
                  if (language) {
                    res.render("home", {
                      profileInfo: foundProfile,
                      myAge: myAge,
                      details: info,
                      languages: language
                    });
                  }
                }
              })

            }
          }
        })

      }
    }
  })
})

app.get("/abilities", function(req, res) {
  Abilities.find({"type" : {$ne: null}},function(err,ability){
    if(err) console.log(err);
    else{
      if(ability){
        Certificates.find({"title" : {$ne: null}},function(err,cert){
          if(err) console.log(err);
          else{
            if(cert){
              res.render("abilities",{ability: ability,certificate: cert});
            }
          }
        })
      }
    }
  })
})


app.get("/experience", function(req, res) {
  Experience.find({"type" : {$ne: null}}).sort({startdate: 'desc'}).exec(function(err,exp){
    if(err) console.log(err);
    else{
      if(exp){
        res.render("experience",{exp: exp});
      }
    }
  })
})

app.get("/projects", function(req, res) {
  Projects.find({"title" : {$ne: null}},function(err,project){
    if(err) console.log(err);
    else{
      if(project){
        res.render("projects",{projects: project});
      }
    }
  })
})

const User = mongoose.model('User', {
  email: {
    type: String,
    required: true
  },
  encryptedPassword: {
    type: String,
    required: true
  },
})

// //SAVE ADMIN CREDENTIALS IN YOUR DATABASE
//
// bcrypt.hash(process.env.A_PASS, 10, function(err, hash) {
//   const newUser= new User({
//     email: process.env.A_USER,
//     encryptedPassword: hash
//   });
//   newUser.save();
// });
// //Pass all configuration settings to AdminBro



const adminBro = new AdminBro({
  resources: [{
    resource: User,
    options: {
      properties: {
        encryptedPassword: {
          isVisible: false,
        },
        password: {
          type: 'string',
          isVisible: {
            list: false,
            edit: true,
            filter: false,
            show: false,
          },
        },
      },
      actions: {
        new: {
          before: async (request) => {
            if (request.payload.record.password) {
              request.payload.record = {
                ...request.payload.record,
                encryptedPassword: await bcrypt.hash(request.payload.record.password, 10),
                password: undefined,
              }
            }
            return request
          },
        }
      }
    }
  }, Profile, Education, Language, Abilities, Certificates, Experience, Projects],
  rootPath: '/admin',
})

const router = AdminBroExpress.buildAuthenticatedRouter(adminBro, {
  authenticate: async (email, password) => {
    const user = await User.findOne({
      email
    })
    if (user) {
      const matched = await bcrypt.compare(password, user.encryptedPassword)
      if (matched) {
        return user
      }
    }
    return false
  },
  cookiePassword: 'some-secret-password-used-to-secure-cookie',
})


app.use(adminBro.options.rootPath, router)


//Listen on port 3000
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port,function() {
  console.log("Server started successfully on port 3000");
})
