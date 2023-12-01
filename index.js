import express, { response } from "express";
import bodyParser from "body-parser";
import pg from "pg";
import 'dotenv/config'

const app = express();
const appPort = 8080;

// Log database credentials
console.log("User: " + process.env.USER);
console.log("Host: " + process.env.HOST);
console.log("Database: " + process.env.DATABASE);
console.log("Password: ***"); // Mask the actual password
console.log("Port: " + process.env.DB_PORT);

const db = new pg.Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD, 
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false,
    }
});

app.use(bodyParser.urlencoded({ extended: true}));
app.use(express.static("public"));

let list_role_family = []; //this array to contain all the digital role families
const fetchRoleFamily = () => {
    const roleFamilyQuery = "SELECT * FROM role_family ORDER BY title ASC";

    db.query(roleFamilyQuery, (err, res) => {
        if (err) {
            console.error("Error executing query", err.stack);
        } else {
            list_role_family = res.rows;
        }
    });
};

let learningOptions70 = []; //this array to contain all the '70' learning options 
const fetchLearningOptions70 = () => {
    const learningOptions70Query = "SELECT id, title FROM learning WHERE category = '70 Learning from experience' ORDER BY title ASC";

    db.query(learningOptions70Query, (err, res) => {
        if (err) {
            console.error("Error executing query", err.stack);
        } else {
            learningOptions70 = res.rows;
        }
    });
};

let learningOptions20 = []; //this array to contain all the '20' learning options 
const fetchLearningOptions20 = () => {
    const learningOptions20Query = "SELECT id, title FROM learning WHERE category = '20 Learning through interactions with others' ORDER BY title ASC";

    db.query(learningOptions20Query, (err, res) => {
        if (err) {
            console.error("Error executing query", err.stack);
        } else {
            learningOptions20 = res.rows;
        }
    });
};

let learningOptions10 = []; //this array to contain all the '10' learning options 
const fetchLearningOptions10 = () => {
    const learningOptions10Query = "SELECT id, title FROM learning WHERE category = '10 Learning through formal training' ORDER BY title ASC";

    db.query(learningOptions10Query, (err, res) => {
        if (err) {
            console.error("Error executing query", err.stack);
        } else {
            learningOptions10 = res.rows;
        }
    });
};

const careerDimensionDescription = {
    'Contribution': ['making a difference'],
    'Competence': ['building expertise'],
    'Confidence': ['trusting and appreciating your talents and abilities'],
    'Connection': ['cultivating relationships and deepening networks'],
    'Challenge': ['stretching beyond what is known and comfortable'],
    'Contentment': ['experiencing satisfaction, ease, and joy in work']
}

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/convo-value", (req, res) => {
    res.render("convo-value.ejs");
});

app.post("/convo-strength", async (req, res) => {
    fetchRoleFamily();

    try {
        const selectedValue = req.body.answerCareerValue; //NOTE FOR INSERT INTO officer TABLE, career_value
        console.log(selectedValue);
        console.log(list_role_family);
    
        const sqlValue = `
            INSERT INTO officer (career_value)
            VALUES ($1)
            RETURNING id
        `;
    
        const result = await db.query(sqlValue, [selectedValue]); //Write into DB: Career Value
        const newOfficerId = result.rows[0].id; //return officer unique ID
    
        console.log(`New Officer ID: ${newOfficerId}`);
    
        return res.redirect(`${newOfficerId}/convo-strength`);

    } catch (error) {
        console.error("Error inserting career_value into officer table:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/:newOfficerId/convo-strength", async (req, res) => {
    fetchRoleFamily();
    res.render("convo-strength.ejs", { data_Family: list_role_family });
})

app.post("/:newOfficerId/convo-dev", async (req, res) => {
    fetchRoleFamily();
    const newOfficerId = req.params['newOfficerId'];

    const selectedStrength = req.body.answerCareerStrength;
    console.log("Strength:", selectedStrength);
    
    const resultStrengthID = await db.query("SELECT id FROM role_family WHERE title = $1", [selectedStrength]);
    const selectedStrengthID = resultStrengthID.rows[0].id; //NOTE FOR UPDATE to officer TABLE, strength_id
    
    // Update db
    const updateQueryStrength = "UPDATE officer SET strength_id = $1 WHERE id = $2";
    await db.query(updateQueryStrength,[selectedStrengthID, newOfficerId]);
    console.log(newOfficerId);

    return res.redirect(`/${newOfficerId}/convo-dev`);
});

app.get("/:newOfficerId/convo-dev", async (req, res) => {
    fetchRoleFamily();
    res.render("convo-dev.ejs", { data_Family: list_role_family });
});


app.post("/:newOfficerId/convo-dev-competency", async (req, res) => {
    const newOfficerId = req.params['newOfficerId'];
    console.log(newOfficerId);
        
    const selectedDevelopmentArea = req.body.answerDevelopmentArea;
    console.log("DevArea:", selectedDevelopmentArea);

    let resultID = []; //to contain the role_family id selected by user
    let role_family_skills = []; //to contain the list of skills required by the selected role_family
    let resultSkillsID = []; //to contain the list of skills id required by the selected role_family
    let role_family_competencies = []; //
    let resultSkillsTitle =[];

    try {
        const selectedDevelopmentAreaID = await db.query(
            "SELECT id FROM role_family WHERE title = $1", //get the role_family id selected by user
            [req.body.answerDevelopmentArea]    
        );
        resultID = selectedDevelopmentAreaID.rows[0].id;  //NOTE FOR UPDATE of dev area to officer TABLE, development_area_id
        console.log(resultID);

        //update DB
        const updateDevAreaID = "UPDATE officer SET development_area_id = $1 WHERE id = $2";
        await db.query(updateDevAreaID,[resultID, newOfficerId]); //UPDATE DB with officer's dev area id
        
        role_family_skills = await db.query(
            "SELECT skill_id FROM rolefamily_skill WHERE rolefamily_ID = $1", //get the list of skills required by the selected role_family
            [resultID]
            );
            
            resultSkillsID = role_family_skills.rows.map(row => row.skill_id); //use the map function to create a new array resultSkillsID by extracting skill_id property
            
            console.log("Skills IDs:", resultSkillsID);
        
        role_family_competencies = await db.query(
            "SELECT title FROM skill where id = ANY($1) ORDER BY title ASC", [resultSkillsID] //query list of skills title based on the role family selected by the user
        );
    
        resultSkillsTitle = role_family_competencies.rows.map(row => row.title); 
        console.log(resultSkillsTitle);
        console.log("First Item:", resultSkillsTitle[0]);
        console.log("Data Competency before rendering:", resultSkillsTitle);

        return res.redirect(`/${newOfficerId}/convo-dev-competency?resultSkillsTitle=${encodeURIComponent(resultSkillsTitle.join(','))}&selectedDevelopmentArea=${encodeURIComponent(selectedDevelopmentArea)}`);
        
    } catch (err) {
        console.log(err);
    } 
});

app.get("/:newOfficerId/convo-dev-competency", async (req, res) => {
    
    const resultSkillsTitle = req.query.resultSkillsTitle ? req.query.resultSkillsTitle.split(',') : [];
    const selectedDevelopmentArea = req.query.selectedDevelopmentArea || '';

    res.render("convo-dev-competency.ejs", { 
        data_competency: resultSkillsTitle,
        data_development_area: selectedDevelopmentArea
    });
});

app.post("/:newOfficerId/702010", async (req, res) => {
    fetchLearningOptions70();
    fetchLearningOptions20();
    fetchLearningOptions10();
    const newOfficerId = req.params['newOfficerId'];

    const selectedDevCompetency = req.body.answerDevCompetency;
    console.log("DevCompetency:", selectedDevCompetency);

    const resultDevCompetencyID = await db.query("SELECT id FROM skill WHERE title = $1", [selectedDevCompetency]);
    const selectedCompetencyID = resultDevCompetencyID.rows[0].id; //NOTE FOR INSERT INTO officer TABLE, competency_for_dev_id

    //update DB
    const updateSelectedCompetencyID = "UPDATE officer SET competency_for_dev_id = $1 WHERE id = $2";
    await db.query(updateSelectedCompetencyID,[selectedCompetencyID, newOfficerId]); //UPDATE DB with officer's selected competency for dev id

    
    return res.redirect(`/${newOfficerId}/702010?selectedDevCompetency=${encodeURIComponent(selectedDevCompetency)}`);

});


app.get("/:newOfficerId/702010", async (req, res) => {
    fetchLearningOptions70();
    fetchLearningOptions20();
    fetchLearningOptions10();
    const selectedDevCompetency = req.query.selectedDevCompetency || '';

    res.render("702010.ejs", {
        data_dev_competency: selectedDevCompetency,
        data_learning_70: learningOptions70,
        data_learning_20: learningOptions20,
        data_learning_10: learningOptions10
    });

});


app.post("/:newOfficerId/form", async (req, res) => {
    const newOfficerId = req.params['newOfficerId'];

    const selectedCheckboxes = req.body.answerLearning;
    console.log(selectedCheckboxes);
    if (Array.isArray(selectedCheckboxes) && selectedCheckboxes.length === 3) {
        const [learningTitle1, learningTitle2, learningTitle3] = selectedCheckboxes //NOTE FOR INSERT INTO officer TABLE, learning1_id, learning2_id, learning3_id
        console.log(learningTitle1);
        console.log(learningTitle2);
        console.log(learningTitle3);
    } else {
        console.error("Invalid selectedCheckboxes:", selectedCheckboxes);
        res.status(400).send("Invalid request");
    }
    

    try {
        if (selectedCheckboxes && selectedCheckboxes.length === 3) {
            const resultLearningIDs = await db.query("SELECT id, title FROM learning WHERE title = ANY($1::text[])", [selectedCheckboxes]);
            const selectedLearningIDs = resultLearningIDs.rows.map(row => row.id);
    
            //update DB
            const updateSelectedLearnings = "UPDATE officer SET learning1_id = $1, learning2_id = $2, learning3_id = $3 WHERE id = $4";
            await db.query(updateSelectedLearnings,[selectedLearningIDs[0], selectedLearningIDs[1], selectedLearningIDs[2], newOfficerId]); //UPDATE DB with officer's selected learningsx3 ids
    
            return res.redirect(`/${newOfficerId}/form`);
        } 
    } catch (error) {
        console.error("Error processing form:", error);
        res.status(500).send("Internal Server Error");
    }
  
});


app.get("/:newOfficerId/form", (req, res) => {
    res.render("form.ejs");
});

app.post("/:newOfficerId/devplan", (req, res) => {
    const newOfficerId = req.params['newOfficerId'];

    const firstName = req.body["firstName"];
    const lastName = req.body["lastName"];
    const linkedIn = req.body["LinkedIn Profile"];
    const jobTitle = req.body["Job Title"];
    console.log(firstName, lastName, linkedIn, jobTitle);
    console.log(req.body)
    
    
    try {
        //update DB
        const updateOfficerDetails = "UPDATE officer SET first_name = $1, last_name = $2, linkedin_profile = $3, job_title = $4 WHERE id = $5";
        db.query(updateOfficerDetails,[firstName, lastName, linkedIn, jobTitle, newOfficerId]); 
    } catch (error) {
        console.error("Error processing form:", error);
        res.status(500).send("Internal Server Error");
    }

    return res.redirect(`/${newOfficerId}/devplan`);
});

app.get("/:newOfficerId/devplan", async (req, res) => {
    const newOfficerId = req.params['newOfficerId'];
    console.log(newOfficerId);
    
    let resultCareerDevPlan = await db.query("SELECT * FROM officer WHERE id = $1", [newOfficerId]); 
    console.log(resultCareerDevPlan.rows);

    let firstName = resultCareerDevPlan.rows[0].first_name;
    let linkedInProfile = resultCareerDevPlan.rows[0].linkedin_profile;
    let jobTitle = resultCareerDevPlan.rows[0].job_title;
    let careerValue = resultCareerDevPlan.rows[0].career_value;
    let careerPriorityDescription = careerDimensionDescription[careerValue] || [];
    
    //+++STRENGTH+++: Query all things related to user selected Strength
    let queryStrengthCDP = "SELECT title FROM role_family WHERE id = $1"
    let strengthIdCDP = resultCareerDevPlan.rows[0].strength_id;
    let strengthCDPResult = await db.query(queryStrengthCDP, [strengthIdCDP]);
    let strengthCDP = strengthCDPResult.rows[0].title;
    console.log(strengthIdCDP, strengthCDP);

    let strengthRolesResult = await db.query("SELECT * FROM digi_role WHERE role_family_id = $1", [strengthIdCDP]);
    let strengthRoles = strengthRolesResult.rows.map(row => ({
        title: row.title,
        description: row.description
    }));
    
    let strengthListOfSkillsIdResult = await db.query("SELECT skill_id FROM rolefamily_skill WHERE rolefamily_id = $1", [strengthIdCDP]);
    //Extract skill IDs from the result of the strengthListOfSkillsIdResult query
    const strengthListOfSkillsId = strengthListOfSkillsIdResult.rows.map(row => row.skill_id);
    //Use ANY clause to retrieve titles for the identified skill IDs
    let strengthListOfSkillsTitleResult = await db.query("SELECT title FROM skill WHERE id = ANY($1)", [strengthListOfSkillsId]);
    //Extract skill titles from the strengthListOfSkillsTitleResult
    const strengthListOfSkillsTitle = strengthListOfSkillsTitleResult.rows.map(row => row.title);


    //+++AREA FOR DEVELOPMENT+++: Query all things related to user selected area for development
    let queryDevAreaCDP = "SELECT title FROM role_family WHERE id = $1"
    let devAreaIdCDP = resultCareerDevPlan.rows[0].development_area_id;
    let devAreaCDPResult = await db.query(queryDevAreaCDP, [devAreaIdCDP]);
    let devAreaTitle = devAreaCDPResult.rows[0].title;
    
    let queryDevCompetencyCDP = "SELECT title, level1_desc, level2_desc, level3_desc, level4_desc, level5_desc, level6_desc, level7_desc FROM skill WHERE id = $1"
    let devCompetencyIdCDP = resultCareerDevPlan.rows[0].competency_for_dev_id;
    let devCompetencyCDPResult = await db.query(queryDevCompetencyCDP, [devCompetencyIdCDP]);
    let devCompetencyTitle = devCompetencyCDPResult.rows[0].title;
    const competencyDescAll = [devCompetencyCDPResult.rows[0].level1_desc || '-', devCompetencyCDPResult.rows[0].level2_desc || '-', devCompetencyCDPResult.rows[0].level3_desc || '-', devCompetencyCDPResult.rows[0].level4_desc || '-', devCompetencyCDPResult.rows[0].level5_desc || '-', devCompetencyCDPResult.rows[0].level6_desc || '-', devCompetencyCDPResult.rows[0].level7_desc || '-'];
    console.log(competencyDescAll);

    //+++LEARNING+++: Query all things related to user selected Learning interventions
    const learningAllIdsCDP = [resultCareerDevPlan.rows[0].learning1_id, resultCareerDevPlan.rows[0].learning2_id, resultCareerDevPlan.rows[0].learning3_id];      
    let queryLearningCDP = "SELECT title FROM learning WHERE id = ANY($1) AND category = $2";
    let learning70CDPResult = await db.query(queryLearningCDP, [learningAllIdsCDP, "70 Learning from experience"]);
    let learning20CDPResult = await db.query(queryLearningCDP, [learningAllIdsCDP, "20 Learning through interactions with others"]);
    let learning10CDPResult = await db.query(queryLearningCDP, [learningAllIdsCDP, "10 Learning through formal training"]);
    const learning70 = learning70CDPResult.rows.map(row => row.title);
    const learning20 = learning20CDPResult.rows.map(row => row.title);
    const learning10 = learning10CDPResult.rows.map(row => row.title);

    //Render Career Dev Plan
    res.render("devplan.ejs", {
        fName : firstName,
        linkedIn : linkedInProfile,
        job: jobTitle, 
        careerPriority : careerValue,
        careerPriorityDescriptionCDP : careerPriorityDescription, 
        strength : strengthCDP, 
        strengthRolesCDP : strengthRoles,
        strengthSkillsCDP : strengthListOfSkillsTitle,
        devAreaCDP : devAreaTitle,
        devCompetencyCDP: devCompetencyTitle,
        competencyDesc1to7: competencyDescAll, 
        learning70CDP : learning70,
        learning20CDP : learning20,
        learning10CDP : learning10
    });
});

app.listen(appPort, () => {
    console.log(`Server running on port: ${appPort}`);
});
