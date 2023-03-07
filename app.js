const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
let db;
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
const initializedb = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3020, () => {
      console.log("Server is Running at ........");
    });
  } catch (e) {
    console.log("DB:ERROR");
  }
};
initializedb();

const authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (authHeader === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "nithin", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        //request.username = payload.username;
        next();
      }
    });
  }
};
const convert = (objecta) => {
  return {
    stateId: objecta.state_id,
    stateName: objecta.state_name,
    population: objecta.population,
  };
};
app.get("/states/", authentication, async (request, response) => {
  const dbquery = `SELECT 
                     *
                     FROM
                      state
                      ORDER BY state_id;`;
  const stateslist = await db.all(dbquery);
  const converted = stateslist.map((eachobj) => {
    return convert(eachobj);
  });
  //console.log(converted);
  response.send(converted);
});

// api2 gettin particular state

app.get("/states/:stateId/", authentication, async (request, response) => {
  const { stateId } = request.params;
  const dbquery = `SELECT 
                        state_id as stateId,
                        state_name as stateName,
                        population 
                    FROM 
                    state 
                    WHERE state_id = ${stateId};`;
  const dbresponse = await db.get(dbquery);

  response.send(dbresponse);
});

// api3 creating a district post

app.post("/districts/", authentication, async (request, response) => {
  const districtdetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtdetails;
  const dbquery = `INSERT
                        INTO 
                        district(district_name,state_id,cases,cured,active,deaths)
                        VALUES("${districtName}",${stateId},${cases},${cured},${active},${deaths})`;
  const dbresponse = await db.run(dbquery);
  response.send("District Successfully Added");
});

//api 4 get details based on district_id

app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const dbquery = `SELECT
                     district_id as districtId,
                     district_name as districtName,
                     state_id as stateId,
                     cases as cases,
                     cured as cured,
                     active as active,
                     deaths as deaths
                      FROM 
                     district 
                     WHERE district_id = ${districtId};`;
    const dbresponse = await db.get(dbquery);

    response.send(dbresponse);
  }
);

// api 5 delete district based on id
app.delete("/districts/:districtId/", authentication, (request, response) => {
  const { districtId } = request.params;
  const dbquery = `DELETE FROM district WHERE district_id = ${districtId}`;
  const dbresponse = db.run(dbquery);
  response.send("District Removed");
});

// api6 update details on distritid

app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const districtdetails = request.body;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = districtdetails;
    const dbquery = `UPDATE 
                    district 
                    SET 
                    district_name = "${districtName}",
                    state_id = ${stateId},
                    cases = ${cases},
                    cured = ${cured},
                    active = ${active},
                    deaths = ${deaths};`;
    const dbresponse = await db.run(dbquery);
    response.send("District Details Updated");
  }
);

// api7 get total sum of cases ,cured ,.....

app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;
    console.log(stateId);
    const dbquery = `SELECT
                        sum(cases) as totalCases,
                        sum(cured) as totalCured,
                        sum(active) as totalActive,
                        sum(deaths) as totalDeaths
                        FROM
                        district 
                       WHERE state_id = ${stateId};`;
    const dbresponse = await db.get(dbquery);

    response.send(dbresponse);
  }
);

// return statename baseon id

app.get(
  "/districts/:districtId/details/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const dbquery = ` SELECT 
                        state_name as stateName
                        FROM 
                        state NATURAL JOIN district
                         
                         WHERE district_id = ${districtId};`;
    const dbresponse = await db.get(dbquery);
    console.log(dbresponse);
    response.send(dbresponse);
  }
);

// api login

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const dbquery = `SELECT * FROM user WHERE username = "${username}";`;
  const dbresponse = await db.get(dbquery);
  if (dbresponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispassword = await bcrypt.compare(password, dbresponse.password);
    console.log(ispassword);
    if (ispassword === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "nithin");
      console.log(jwtToken);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
