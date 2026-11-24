Blue Alliance Robotics History

Project Description: This project explores the history of robotics teams connected to The Blue Alliance and FIRST Robotics Competition (FRC). The website organizes information about robotics teams, important events, competitions, and team history. The original website is called Community Archives and was built using HTML, CSS, and JavaScript. The project has now been expanded into a full-stack application using React, Vite, Node.js, and Express.

Technologies Used: HTML, CSS, and JavaScript are used for the original website. React is used to build the new front end. Vite runs the React development server. Node.js and Express power the back end and REST API. Vitest and Supertest are used to test the API. GitHub is used to store the project and manage changes.

Reflection: We built the Blue Alliance Robotics History website using HTML, CSS, and JavaScript. We separated the page into a header, navigation, main sections, and footer to keep the code organized and make it easier to update. We also considered accessibility by using meaningful HTML elements, descriptive links, and alternative text for images. We used Flexbox to line up items like the FIRST logo, website title, and navigation links. We used Grid to organize the timeline cards into rows and columns. These layouts help keep the website organized on different screen sizes.
We also used CSS media queries to adjust the layout for phones and smaller screens. One of our biggest challenges was getting the website on GitHub Pages to look like our original design. At first, the page showed basic text instead of the blue header, timeline cards, and footer we wanted. We had to look through our HTML and CSS to figure out what was wrong. Then we had another issue with Github Pages not loading our content correctly, which we solved by properly nesting html items under proper parent items, and inactive styles being overlayed as the active which just required a more thorough status check. We also had trouble matching the CSS filename in the HTML and finding the right place to change spacing. By checking our code and testing changes in the browser, we learned how small mistakes can affect the whole page. 
The JavaScript has overall been difficult, with the responsiveness we're going for, there has been a lot more JS development than either of us had planned for, but through a lot of trial and error, we now have a template we can use to add as many items as we want, making theh content pass just about complete. All that's missing is the actual researched content which will be added as we progress through the milestones more. For using this, look over the JS file heavily, the Events and Teams consts are for creating your content, with further sections creating the fading timeline effect, autoplay on the image carousal, and button navigating.
Everything has been done in one web page so all it should take is 1 load and you can then enjoy the entire website, and it also means that there is not much need for HTML edits, only CSS edits and JS edits. In case we don't get around to it in a later milestone, the spacing of content while is fine as is, could be improved, same with the amount of timeline cards viewable, maybe consider some edits of both if, again, we don't get to it. This project helped us better understand how HTML, CSS, and JavaScript work together. We also learned that testing the website and fixing problems are important parts of web development.

Project Structure: The root folder contains the website files, including index.html, style.css, script.js, and first_logo.png. The frontend folder contains the React application and Vite configuration. The backend folder contains the Express server, API routes, controllers, team data, and tests. The repository also contains documentation files that explain the API, project status, known issues, and debugging process.


Project Documentation: HANDOFF_SUMMARY.md explains the project and its current status. API_CONTRACT.md explains how the front end communicates with the back end. KNOWN_ISSUES.md explains current problems and unfinished work. DEBUGGING_ANALYSIS.md explains how a request travels from React to Express and back. Teamlog.md contains project development notes. A new developer should read these files before making major changes.

Getting Started from a Fresh Clone: Install Git and Node.js with npm, then clone the repository and enter its folder:

```sh
git clone https://github.com/risecelestial/blue-alliance-robotics-history.git
cd blue-alliance-robotics-history
```

The original static website can be opened by opening index.html in a browser. To run the React application with its API, open two terminals in the cloned repository. In the first terminal, start the back end:

```sh
cd backend
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm start
```

In the second terminal, start the front end:

```sh
cd frontend
npm install
npm run dev
```

Keep both terminals running. Open the local URL printed by Vite, normally http://localhost:5173. The API should be available at http://localhost:3000/api/teams; if team data does not load, confirm the back-end server is still running. To verify the setup, run `npm test` from the backend folder and `npm run build` from the frontend folder. Tests use a separate database file (test.db) and never touch your development data; run 'npm test' from the backend folder.

## Environment Variables
Copy `backend/.env.example` to `backend/.env` before running. `.env` is in `.gitignore` and should never be committed.

Variable: PORT
Purpose: Port the API listens on (3000)

Variable: DATABASE_URL
Purpose: SQLite file

Variable: CORS_ORIGINS
Purpose: Comma separated browser origins allowed to call the API

## Data Model Rationale
The API stores teams in two related tables: Team and TeamImage. Each team has exactly one row in Team, while its photos live in TeamImage, linked by teamId with onDelete: Cascade. I chose this over a single Team table with an images column because SQLite has no array type, and the app genuinely needs an ordered list of photos per team that will grow as the archive gains galleries. The trade-off is referential integrity versus schema flexibility. Storing images as a JSON string would be simpler and faster to read, but the database could not guarantee that every image belongs to a real team, and orphaned or malformed entries could appear. With a foreign key, deleting a team removes its images automatically, and the cost is one extra join, handled by a single Prisma include. The cost is small because even every FIRST team ever registered is only thousands of rows. I also made Team.number unique at the database level. FRC team numbers are the natural identifier, so the database itself rejects duplicates even if validation is bypassed or two requests collide, though the API still checks first so it can return a friendly 409. The primary key remains a separate integer id, because team numbers are real-world values that could in principle be corrected, and the API converts the id to a string to preserve the existing contract. Because Prisma abstracts the engine, moving from SQLite to PostgreSQL for production would mainly mean changing the datasource provider and connection URL.

## Security

This API has no user accounts, so it addresses three OWASP Top 10 categories that apply without authentication. Each mitigation is marked in the code with an // OWASP: comment.

### A03:2021 - Injection
An attacker submits crafted input (for example `Robert'); DROP TABLE Team;--` as a team name, or a `javascript:` URL as an image) hoping it is executed as SQL or later interpreted as script in the page. All database access uses Prisma Client's parameterized queries, and the code never builds SQL from user input or uses raw queries. In addition, `validateTeam` in `controllers/teamController.js` enforces exact types (a number sent as the string `"12"` is rejected), length limits, a valid year range, and allows only `http`/`https` image URLs. Tests confirm SQL-looking text is stored as plain text and unsafe URLs are refused.

### A05:2021 - Security Misconfiguration
Default settings can leak information or widen the attack surface: stack traces reveal file paths and versions, `X-Powered-By: Express` advertises the framework, wildcard CORS lets any website call the API, and unlimited bodies allow resource exhaustion. `app.js` applies `helmet()`, restricts CORS to the origins in `CORS_ORIGINS`, limits JSON bodies to 100 KB (returning `413`), and uses a central error handler that sends clients only generic messages. Tests check the headers, the body limit, and that errors contain no stack trace.

### A09:2021 - Security Logging and Monitoring Failures
Without logs, probing (many failed validations, repeated lookups of missing ids) and destructive actions (deletes) leave no trace. `lib/logger.js` writes one structured JSON line per security-relevant event: validation failures, unknown ids, duplicate attempts, creates, updates, deletes, and unhandled errors with full stack traces. Logs stay on the server, include method, path and client IP, and omit request bodies so personal data is not recorded.

### Not covered
A01 Broken Access Control and A07 Authentication Failures are not addressed because the app has no users yet.

Project Credits: Original Project Creators: Rohanji Novas and Eric Edwards. FIRST Robotics: https://www.firstinspires.org/. The Blue Alliance: https://www.thebluealliance.com/.
