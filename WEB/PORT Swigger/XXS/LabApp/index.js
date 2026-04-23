const express = require('express');
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
let savedExploit = "<h1>Exploit Server</h1><p>No exploit saved yet.</p>";

// Lab Data Structure
const labs = [
    {
        id: 1,
        name: "Reflected XSS into HTML context with nothing encoded",
        difficulty: "APPRENTICE",
        difficultyClass: "apprentice",
        description: "This lab contains a simple reflected XSS vulnerability in the search functionality.",
        intro: "The application reflects your search query directly in the results page without any sanitization. This is the most basic form of reflected XSS.",
        learning: "Learn how unencoded user input can be interpreted as code by the browser.",
        payload: "<script>alert(1)</script>",
        solution: "Submit the payload <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> in the search box to trigger the alert.",
        url: "/lab/reflected-xss",
        full_description: `
            <h1 style="color:#ff6600; font-size:24px; margin-top:0;">Reflected XSS into HTML context with nothing encoded</h1>
            <span style="background:#e8f5e9; color:#28a745; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:12px;">APPRENTICE</span>
            <p style="margin-top:15px;">This lab contains a simple reflected XSS vulnerability in the search functionality.</p>
            <p>To solve the lab, perform a cross-site scripting attack that calls the <code>alert()</code> function.</p>
            
            <h3>Detailed Solution - Step by Step</h3>
            <ol>
                <li><strong>Identify the injection point:</strong> Notice that the search term is reflected directly in the page header.</li>
                <li><strong>Test for reflection:</strong> Enter a simple string like <code>hello</code> and see it appear in the results.</li>
                <li><strong>Inject a script tag:</strong> Enter <code>&lt;script&gt;alert(1)&lt;/script&gt;</code>.</li>
                <li><strong>Observe execution:</strong> The browser interprets the <code>&lt;script&gt;</code> tag and executes the JavaScript code, triggering the alert pop-up.</li>
            </ol>
            <hr>
            <a href="/" style="color:#666; text-decoration:none;">← Back to Dashboard</a>
        `
    },
    {
        id: 2,
        name: "Reflected XSS into HTML context with most tags and attributes blocked",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "This lab has a Web Application Firewall (WAF) that blocks almost all tags and attributes.",
        intro: "The WAF uses a whitelist approach. You must identify which tags and attributes are allowed to bypass the protection.",
        learning: "Learn how to use less common tags like <code>&lt;body&gt;</code> and events like <code>onresize</code> to bypass strict filters.",
        payload: "<body onresize=print()>",
        solution: "Use the Intruder to find allowed tags. Then, use <code>&lt;body onresize=print()&gt;</code> and deliver it via an iframe from the exploit server to trigger <code>print()</code>.",
        url: "/lab/blocked-tags",
        full_description: `
            <p>This lab contains a reflected XSS vulnerability in the search functionality but uses a web application firewall (WAF) to protect against common XSS vectors.</p>
            <p>To solve the lab, perform a cross-site scripting attack that bypasses the WAF and calls the <code>print()</code> function.</p>
            <p><strong>Note:</strong> Your solution must not require any user interaction. Manually causing print() to be called in your own browser will not solve the lab.</p>
            <h3>Solution</h3>
            <ol>
                <li>Inject a standard XSS vector, such as: <code>&lt;img src=1 onerror=print()&gt;</code>. Observe that this gets blocked.</li>
                <li>In our <b>Simulated Intruder</b>, click <b>Start Attack</b>.</li>
                <li>Review the results. Note that most payloads caused a <b>400 response</b>, but the <code>body</code> payload caused a <b>200 response</b>.</li>
                <li>Similarly, the second intruder attack shows that the <code>onresize</code> attribute is allowed.</li>
                <li>Go to the <b>Exploit Server</b> and paste the following code:
                    <pre style="background:#eee;padding:10px;">&lt;iframe src="http://localhost:3000/lab/blocked-tags?search=%3Cbody%20onresize=print()%3E" onload=this.style.width='100px'&gt;</pre>
                </li>
                <li>Click <b>Store</b> and <b>Deliver exploit to victim</b>.</li>
            </ol>
        `
    },
    {
        id: 3,
        name: "Reflected XSS into HTML context with all tags blocked except custom ones",
        difficulty: "PRACTITIONER",
        difficultyClass: "practitioner",
        description: "This lab blocks all standard HTML tags. However, it fails to block custom tags.",
        intro: "In this lab, the WAF is very strict with standard tags like <code>&lt;script&gt;</code> or <code>&lt;div&gt;</code>, but it doesn't know about custom elements.",
        learning: "Learn how to use custom HTML elements combined with <code>id</code>, <code>tabindex</code>, and <code>onfocus</code> to trigger XSS automatically via URL fragments.",
        payload: "<xss id=x onfocus=alert(document.cookie) tabindex=1>#x",
        solution: "Inject a custom tag with an ID and <code>onfocus</code> event. Use the <code>#id</code> in the URL to automatically focus the element on load.",
        url: "/lab/custom-tags",
        full_description: `
            <p>This lab blocks all HTML tags except custom ones.</p>
            <p>To solve the lab, perform a cross-site scripting attack that injects a custom tag and automatically alerts <code>document.cookie</code>.</p>
            
            <h3>Detailed Solution - Step by Step</h3>
            <ol>
                <li><strong>Target identification:</strong> Identify where the XSS vector can attack. In this lab, we select the <strong>Search Field</strong>.</li>
                <li><strong>Trial & Error:</strong> Try a simple payload like <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> or <code>&lt;h1&gt;</code>. Observe that <strong>no standard tags are allowed</strong> (WAF Blocked).</li>
                <li><strong>Custom Tag Discovery:</strong> Use the Search Field to inject a custom tag: 
                    <code>&lt;custom-tag onmouseover='alert("XSS")'&gt;</code>. 
                    <br><em>Result:</em> This XSS executes, but only when a user manually moves their mouse over the reflected text. We want it to be <strong>automatic</strong>, so we need to use <code>onfocus</code> instead of <code>onmouseover</code>.</li>
                <li><strong>Automated Payload Construction:</strong> 
                    Use <code>&lt;custom-tag onfocus='alert(document.cookie)' id='x' tabindex="1"&gt;</code>.
                    <br><br>
                    <strong>Explanation of Attributes:</strong>
                    <ul>
                        <li><strong>"id" attribute:</strong> Allows us to target a specific element from the URL by making use of the <strong>"# tag"</strong> (URL fragment). This is an HTML feature used for "bookmarking" or jumping to a specific part of a page.</li>
                        <li><strong>"tabindex='1'":</strong> This is an HTML property that makes the element <strong>tabable</strong> (focusable). Without this, a custom tag cannot receive focus.</li>
                        <li><strong>"#x" in the URL:</strong> When appended to the URL, it makes the browser immediately jump to the element with ID 'x' and <strong>focus it automatically</strong> on page load.</li>
                    </ul>
                </li>
                <li><strong>Final Exploit:</strong>
                    Go to the <strong>Exploit Server</strong> and paste the following code (replacing the URL with your lab URL):
                    <pre style="background:#eee;padding:15px;border-radius:4px;overflow-x:auto;">&lt;script&gt;
location = 'http://localhost:3000/lab/custom-tags?search=%3Cxss+id%3Dx+onfocus%3Dalert%28document.cookie%29%20tabindex=1%3E#x';
&lt;/script&gt;</pre>
                </li>
            </ol>
        `
    }
];

// Lab Description Route
app.get('/lab/:id/description', (req, res) => {
    const lab = labs.find(l => l.id == req.params.id);
    if (!lab) return res.redirect('/');
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Description: ${lab.name}</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; margin: 0; background: #f4f7f9; }
            .header { background: #232f3e; color: white; padding: 20px; border-bottom: 4px solid #ff6600; display: flex; justify-content: space-between; align-items: center; }
            .container { max-width: 800px; margin: 40px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            h1 { color: #ff6600; margin-top: 0; }
            .btn { padding: 10px 20px; background: #ff6600; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="color:white; margin:0; font-size:24px;">Lab Description</h1>
            <a href="${lab.url}" class="btn">Back to Lab</a>
        </div>
        <div class="container">
            <h1>${lab.name}</h1>
            <div style="margin-bottom:20px;"><span style="background:#fffde7; color:#856404; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:12px;">${lab.difficulty}</span></div>
            ${lab.full_description}
            <hr>
            <a href="/" style="color:#666;">← Back to Dashboard</a>
        </div>
    </body>
    </html>
    `);
});

// Main Landing Page (Dashboard)
app.get('/', (req, res) => {
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>XSS Master - Learning Platform</title>
        <style>
            :root {
                --primary: #ff6600;
                --bg: #f4f7f9;
                --card-bg: #ffffff;
                --text: #333;
                --apprentice: #28a745;
                --practitioner: #ffc107;
                --expert: #dc3545;
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: var(--bg); color: var(--text); }
            .hero { background: #232f3e; color: white; padding: 60px 20px; text-align: center; border-bottom: 5px solid var(--primary); }
            .hero h1 { margin: 0; font-size: 42px; letter-spacing: 1px; }
            .hero p { opacity: 0.8; font-size: 18px; margin-top: 10px; }
            
            .navbar { background: #1a252f; padding: 15px 50px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; }
            .navbar .logo { color: var(--primary); font-weight: bold; font-size: 20px; text-decoration: none; }
            .navbar .nav-links a { color: white; text-decoration: none; margin-left: 20px; font-size: 14px; font-weight: 500; }
            .navbar .nav-links a:hover { color: var(--primary); }

            .dashboard { max-width: 1200px; margin: 40px auto; padding: 0 20px; }
            .section-title { font-size: 24px; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 10px; display: flex; align-items: center; gap: 10px; }
            
            .lab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 25px; }
            .lab-card { background: var(--card-bg); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: transform 0.3s, box-shadow 0.3s; border: 1px solid #eee; display: flex; flex-direction: column; }
            .lab-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            
            .lab-header { padding: 20px; border-bottom: 1px solid #eee; }
            .lab-status { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
            .badge-apprentice { background: #e8f5e9; color: var(--apprentice); }
            .badge-practitioner { background: #fffde7; color: #856404; }
            
            .lab-body { padding: 20px; flex-grow: 1; }
            .lab-body h3 { margin: 0 0 10px 0; font-size: 18px; color: #232f3e; }
            .lab-body p { font-size: 14px; color: #666; line-height: 1.5; margin-bottom: 15px; }
            
            .lab-footer { padding: 15px 20px; background: #fafafa; border-top: 1px solid #eee; display: flex; gap: 10px; }
            .btn { padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; text-align: center; flex: 1; transition: opacity 0.2s; }
            .btn:hover { opacity: 0.9; }
            .btn-primary { background: var(--primary); color: white; }
            .btn-outline { border: 1px solid #ddd; color: #555; }
            
            .lab-details { display: none; padding: 15px; background: #fff8e1; border-top: 1px solid #ffe082; font-size: 13px; }
            .lab-details.active { display: block; animation: fadeIn 0.3s; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

            code { background: #eee; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
        </style>
        <script>
            function toggleDetails(id) {
                const el = document.getElementById('details-' + id);
                el.classList.toggle('active');
            }
        </script>
    </head>
    <body>
        <div class="navbar">
            <a href="/" class="logo">XSS MASTER</a>
            <div class="nav-links">
                <a href="/">All Labs</a>
                <a href="/exploit-editor">Exploit Server</a>
                <a href="#">Resources</a>
            </div>
        </div>

        <div class="hero">
            <h1>Cross-Site Scripting (XSS)</h1>
            <p>Master the art of client-side exploitation through hands-on practice.</p>
        </div>

        <div class="dashboard">
            <div class="section-title">🚀 Learning Path</div>
            <div class="lab-grid">
                ${labs.map(lab => `
                    <div class="lab-card">
                        <div class="lab-header">
                            <div class="lab-status">
                                <span class="badge badge-${lab.difficultyClass}">${lab.difficulty}</span>
                                <span style="font-size: 12px; color: #999;">#${lab.id}</span>
                            </div>
                            <h3>${lab.name}</h3>
                        </div>
                        <div class="lab-body">
                            <p>${lab.description}</p>
                            <div style="font-size: 13px; color: #444;">
                                <strong>Learning:</strong> ${lab.learning}
                            </div>
                        </div>
                        <div id="details-${lab.id}" class="lab-details">
                            <strong>Quick Intro:</strong> ${lab.intro}<br><br>
                            <strong>Ready-made Payload:</strong> <code>${lab.payload}</code><br><br>
                            <strong>Solution:</strong> ${lab.solution}
                        </div>
                        <div class="lab-footer">
                            <a href="${lab.url}" class="btn btn-primary">Access Lab</a>
                            <button onclick="toggleDetails(${lab.id})" class="btn btn-outline">Hints & Solution</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// LAB 1: Basic Reflected XSS
app.get('/lab/reflected-xss', (req, res) => {
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Content-Security-Policy', "script-src 'unsafe-inline' 'unsafe-eval' *;");
    
    const searchQuery = req.query.search || '';
    
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Reflected XSS Lab</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; margin: 0; background-color: #f4f4f9; }
            .nav-bar { background: #37475a; color: white; padding: 10px 20px; font-size: 14px; border-bottom: 3px solid #ff6600; }
            .split-container { display: flex; max-width: 1500px; margin: 0 auto; gap: 30px; padding: 30px; align-items: flex-start; }
            .lab-panel { flex: 1; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .solution-sidebar { width: 450px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: sticky; top: 20px; }
            input[type="text"] { width: 70%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
            button { padding: 12px 24px; background-color: #ff6600; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
            .result-box { padding: 15px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; margin-top: 20px; }
            .code-display { background: #eee; padding: 10px; border-radius: 4px; font-family: monospace; color: #d14; border: 1px solid #ccc; word-break: break-all; }
        </style>
    </head>
    <body>
        <div class="nav-bar">
            <span>Reflected XSS into HTML context with nothing encoded</span>
        </div>
        <div class="container" style="text-align:left; border-radius:0; box-shadow:none; border-bottom:1px solid #ccc; padding: 10px 30px; background: #fff;">
            <div style="display:flex; align-items:center; gap:20px;">
                <a href="/" style="color:#ff6600; text-decoration:none; font-weight:bold; font-size:20px;">🏠 Home</a>
                <div style="height:20px; border-left:1px solid #ccc;"></div>
                <a href="/exploit-editor" style="background:#ff6600; color:white; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:2px;">Go to exploit server</a>
            </div>
        </div>

        <div class="split-container">
            <div class="lab-panel">
                <h2 style="color:#ff6600; margin-top:0;">Lab: Reflected XSS into HTML context</h2>
                <div style="background: #eef2f5; padding: 15px; border-radius: 4px; border-left: 5px solid #ff6600; margin-bottom:20px;">
                    <p style="margin:0;">Perform a reflected XSS attack that calls a pop-up.</p>
                </div>

                <form action="/lab/reflected-xss" method="GET">
                    <input type="text" name="search" placeholder="Search the blog..." value="${searchQuery.replace(/"/g, '&quot;')}">
                    <button type="submit">Search</button>
                </form>

                ${searchQuery ? `
                    <div style="margin-top:20px;">
                        <section class="blog-header" style="padding: 20px 0; border-bottom: 1px solid #eee;">
                            <h1 style="font-weight: normal; margin: 0; color: #333; font-size: 28px;">
                                0 search results for '${searchQuery}'
                            </h1>
                            <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;">
                        </section>
                        
                        <div style="margin-top: 30px; border: 1px solid #333; border-radius: 4px; overflow: hidden; font-family: monospace; font-size: 13px; background: #282c34; color: #abb2bf; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                            <div style="background: #21252b; padding: 8px 15px; border-bottom: 1px solid #181a1f; color: #d7dae0; display: flex; align-items: center; gap: 10px; font-weight: bold;">
                                <span>🔍 DOM Inspector</span>
                            </div>
                            <div style="padding: 15px; line-height: 1.5; white-space: pre; overflow-x: auto;">
<span style="color: #e06c75;">&lt;section</span> <span style="color: #d19a66;">class</span>=<span style="color: #98c379;">"blog-header"</span><span style="color: #e06c75;">&gt;</span>
    <span style="color: #e06c75;">&lt;h1&gt;</span>
        0 search results for '
        <span style="background: rgba(255,255,255,0.1); padding: 2px; border-radius: 2px;">${searchQuery.replace(/</g, '&lt;')}</span>'
    <span style="color: #e06c75;">&lt;/h1&gt;</span>
    <span style="color: #e06c75;">&lt;hr&gt;</span>
<span style="color: #e06c75;">&lt;/section&gt;</span></div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="solution-sidebar">
                ${labs[0].full_description}
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// LAB 2: WAF Lab (COMPLETELY ISOLATED)
app.get('/lab/blocked-tags', (req, res) => {
    res.setHeader('X-XSS-Protection', '0');
    const s = req.query.search || '';
    
    // WAF Logic (Matching PortSwigger Lab 2 exactly)
    const allowedTags = ['body'];
    const allowedAttributes = ['onresize'];

    let err = null;
    const tagMatch = s.match(/<([a-zA-Z0-9]+)/g);
    if (tagMatch) {
        for (let t of tagMatch) {
            let n = t.substring(1).toLowerCase();
            if (!allowedTags.includes(n)) { err = `WAF Blocked Tag: <${n}>`; break; }
        }
    }
    const attrMatch = s.match(/([a-zA-Z0-9]+)\s*=/g);
    if (attrMatch && !err) {
        for (let a of attrMatch) {
            let n = a.split('=')[0].trim().toLowerCase();
            if (!allowedAttributes.includes(n)) { err = `WAF Blocked Event/Attribute: ${n}`; break; }
        }
    }

    if (err) {
        return res.status(400).send(`
            <div style="font-family: sans-serif; padding: 20px;">
                <h1 style="font-size: 32px; font-weight: bold;">Client Error: Forbidden</h1>
            </div>
        `);
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Lab 2 - WAF Bypass</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background-color: #f0f2f5; }
            .nav-bar { background: #37475a; color: white; padding: 10px 20px; font-size: 14px; border-bottom: 3px solid #ff6600; }
            .split-container { display: flex; max-width: 1600px; margin: 0 auto; gap: 30px; padding: 20px; align-items: flex-start; }
            .lab-panel { flex: 1; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .solution-sidebar { width: 450px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: sticky; top: 20px; }
            input[type="text"] { width: 70%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
            button { padding: 12px 24px; background-color: #ff6600; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
            .intruder { background: #ffffff; border: 1px solid #e0e0e0; padding: 25px; margin-top: 35px; border-radius: 8px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
            .list { background: #f8f9fa; border: 1px solid #ddd; padding: 10px; height: 120px; overflow-y: scroll; font-family: 'Consolas', monospace; font-size: 12px; color: #666; border-radius: 4px; }
            #tbl { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #ddd; font-size: 14px; }
            #tbl th { background: #f2f2f2; padding: 12px; border: 1px solid #ddd; text-align: left; }
            #tbl td { padding: 10px; border: 1px solid #ddd; }
            .status-200 { color: #28a745; font-weight: bold; }
            .status-400 { color: #dc3545; }
            .badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; text-transform: uppercase; font-weight: bold; }
            .badge-allowed { background: #d4edda; color: #155724; }
            .badge-blocked { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="nav-bar">
            <span>Reflected XSS into HTML context with most tags and attributes blocked</span>
        </div>
        <div class="container" style="text-align:left; border-radius:0; box-shadow:none; border-bottom:1px solid #ccc; padding: 10px 30px; background: #fff;">
            <div style="display:flex; align-items:center; gap:20px;">
                <a href="/" style="color:#ff6600; text-decoration:none; font-weight:bold; font-size:20px;">🏠 Home</a>
                <div style="height:20px; border-left:1px solid #ccc;"></div>
                <a href="/exploit-editor" style="background:#ff6600; color:white; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:2px;">Go to exploit server</a>
            </div>
        </div>

        <div class="split-container">
            <div class="lab-panel">
                <h2 style="color:#ff6600; margin-top:0;">Lab: Reflected XSS with most tags and attributes blocked</h2>
                <p style="background:#eef2f5;padding:15px;border-left:5px solid #ff6600;">Bypass the WAF to trigger <code>print()</code> without user interaction.</p>
                <form action="/lab/blocked-tags" method="GET">
                    <input type="text" name="search" placeholder="Search..." value="${s.replace(/"/g, '&quot;')}">
                    <button type="submit">Search</button>
                </form>

                ${s ? `
                    <div style="margin-top:20px;">
                        <section class="blog-header" style="padding: 20px 0; border-bottom: 1px solid #eee;">
                            <h1 style="font-weight: normal; margin: 0; color: #333; font-size: 28px;">
                                0 search results for '${s}'
                            </h1>
                            <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;">
                        </section>
                        
                        <div style="margin-top: 30px; border: 1px solid #333; border-radius: 4px; overflow: hidden; font-family: monospace; font-size: 13px; background: #282c34; color: #abb2bf; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                            <div style="background: #21252b; padding: 8px 15px; border-bottom: 1px solid #181a1f; color: #d7dae0; display: flex; align-items: center; gap: 10px; font-weight: bold;">
                                <span>🔍 DOM Inspector</span>
                            </div>
                            <div style="padding: 15px; line-height: 1.5; white-space: pre; overflow-x: auto;">
<span style="color: #e06c75;">&lt;section</span> <span style="color: #d19a66;">class</span>=<span style="color: #98c379;">"blog-header"</span><span style="color: #e06c75;">&gt;</span>
    <span style="color: #e06c75;">&lt;h1&gt;</span>
        0 search results for '
        <span style="background: rgba(255,255,255,0.1); padding: 2px; border-radius: 2px;">${s.replace(/</g, '&lt;')}</span>'
    <span style="color: #e06c75;">&lt;/h1&gt;</span>
    <span style="color: #e06c75;">&lt;hr&gt;</span>
<span style="color: #e06c75;">&lt;/section&gt;</span></div>
                        </div>
                    </div>
                ` : ''}
            <div class="intruder">
                <h3>🛠️ Simulated Intruder</h3>
                <button onclick="start()" id="btn" style="background:#2c3e50;color:white;border:none;padding:10px;cursor:pointer;">Start Attack</button>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:15px;text-align:left;">
                    <div class="list" id="tags">abbr, acronym, address, animate, animatemotion, animatetransform, applet, area, article, aside, audio, b, base, bdi, bdo, big, blink, blockquote, body, br, button, canvas, caption, center, cite, code, col, colgroup, command, content, data, datalist, dd, del, details, dfn, dialog, dir, div, dl, dt, element, em, embed, fieldset, figcaption, figure, font, footer, form, frame, frameset, h1, head, header, hgroup, hr, html, i, iframe, image, img, input, ins, kbd, keygen, label, legend, li, link, listing, main, map, mark, marquee, menu, menuitem, meta, meter, multicol, nav, nextid, nobr, noembed, noframes, noscript, object, ol, optgroup, option, output, p, param, picture, plaintext, pre, progress, q, rb, rp, rt, rtc, ruby, s, samp, script, section, select, set, shadow, slot, small, source, spacer, span, strike, strong, style, sub, summary, sup, svg, table, tbody, td, template, textarea, tfoot, th, thead, time, title, tr, track, tt, u, ul, var, video, wbr, xmp, xss</div>
                    <div class="list" id="events">onafterprint, onanimationcancel, onanimationend, onanimationiteration, onanimationstart, onauxclick, onbeforecopy, onbeforecut, onbeforeinput, onbeforematch, onbeforepaste, onbeforeprint, onbeforetoggle, onbeforeunload, onbegin, onblur, oncancel, oncanplay, oncanplaythrough, onchange, onclick, onclose, oncommand, oncontentvisibilityautostatechange, oncontextmenu, oncopy, oncuechange, oncut, ondblclick, ondrag, ondragend, ondragenter, ondragexit, ondragleave, ondragover, ondragstart, ondrop, ondurationchange, onend, onended, onerror, onfocus, onfocusin, onfocusout, onformdata, onfullscreenchange, ongesturechange, ongestureend, ongesturestart, ongotpointercapture, onhashchange, oninput, oninvalid, onkeydown, onkeypress, onkeyup, onload, onloadeddata, onloadedmetadata, onloadstart, onlocation, onlostpointercapture, onmessage, onmousedown, onmouseenter, onmouseleave, onmousemove, onmouseout, onmouseover, onmouseup, onmousewheel, onmozfullscreenchange, onpagehide, onpagereveal, onpageshow, onpageswap, onpaste, onpause, onplay, onplaying, onpointercancel, onpointerdown, onpointerenter, onpointerleave, onpointermove, onpointerout, onpointerover, onpointerrawupdate, onpointerup, onpopstate, onprogress, onpromptaction, onpromptdismiss, onratechange, onrepeat, onreset, onresize, onscroll, onscrollend, onscrollsnapchange, onscrollsnapchanging, onsearch, onsecuritypolicyviolation, onseeked, onseeking, onselect, onselectionchange, onselectstart, onslotchange, onsubmit, onsuspend, ontimeupdate, ontoggle, ontouchcancel, ontouchend, ontouchmove, ontouchstart, ontransitioncancel, ontransitionend, ontransitionrun, ontransitionstart, onunhandledrejection, onunload, onvalidationstatuschange, onvolumechange, onwaiting, onwebkitanimationend, onwebkitanimationiteration, onwebkitanimationstart, onwebkitfullscreenchange, onwebkitmouseforcechanged, onwebkitmouseforcedown, onwebkitmouseforceup, onwebkitmouseforcewillbegin, onwebkitplaybacktargetavailabilitychanged, onwebkitpresentationmodechanged, onwebkittransitionend, onwebkitwillrevealbottom, onwheel</div>
                </div>
                <table id="tbl" style="display:none;">
                    <thead>
                        <tr>
                            <th>Payload</th>
                            <th>Status Code</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody id="res"></tbody>
                </table>
                <div id="recommended-payload" style="display:none;margin-top:25px;padding:20px;background:#e7f3ff;border:1px solid #b8daff;border-radius:8px;text-align:left;">
                    <h4 style="margin-top:0;color:#004085;">🎯 Identified Exploit Payload</h4>
                    <p>The intruder found that the following payload bypasses the WAF:</p>
                    <div style="background:#fff;padding:10px;border:1px solid #ddd;border-radius:4px;font-family:monospace;font-size:16px;color:#d63384;">
                        <code id="payload-code"></code>
                    </div>
                    <p style="font-size:13px;color:#666;margin-top:10px;"><strong>Next Step:</strong> Paste this into the search box, or deliver it via an iframe from the Exploit Server.</p>
                </div>
            </div>
        </div>
        <div class="solution-sidebar">
            ${labs[1].full_description}
        </div>
    </div>
        <script>
            async function start() {
                try {
                    const btn = document.getElementById('btn');
                    const resBody = document.getElementById('res');
                    const tbl = document.getElementById('tbl');
                    
                    if (!btn || !resBody || !tbl) {
                        console.error('Critical elements missing!');
                        return;
                    }

                    btn.disabled = true;
                    btn.innerText = '🚀 Attacking...';
                    tbl.style.display = "table";
                    resBody.innerHTML = '';

                    const tagsText = document.getElementById('tags').innerText;
                    const eventsText = document.getElementById('events').innerText;
                    
                    const tags = tagsText.split(',').map(function(x) { return '<' + x.trim() + '>'; });
                    const events = eventsText.split(',').map(function(x) { return 'body ' + x.trim() + '='; });
                    const payloads = tags.concat(events);
                    const results = [];

                    for (var i = 0; i < payloads.length; i++) {
                        var p = payloads[i];
                        try {
                            const response = await fetch('/lab/blocked-tags?search=' + encodeURIComponent(p));
                            const status = response.status;
                            const label = (status === 200 ? 'Allowed' : 'Blocked');
                            const bClass = (status === 200 ? 'badge-allowed' : 'badge-blocked');
                            
                            const resObj = { payload: p, status: status, label: label, badgeClass: bClass };
                            results.push(resObj);

                            // Progress update
                            var row = document.createElement('tr');
                            row.innerHTML = '<td><code>' + p.replace(/</g, '&lt;') + '</code></td>' +
                                            '<td class="status-' + status + '">' + status + '</td>' +
                                            '<td><span class="badge ' + bClass + '">' + label + '</span></td>';
                            resBody.appendChild(row);
                            
                            window.scrollTo(0, document.body.scrollHeight);
                        } catch (e) {
                            console.error('Fetch error:', e);
                        }
                        await new Promise(function(r) { setTimeout(r, 5); });
                    }

                    // Sort: 200 first
                    results.sort(function(a, b) { return a.status - b.status; });

                    // Re-render
                    resBody.innerHTML = '';
                    for (var j = 0; j < results.length; j++) {
                        var r = results[j];
                        var sRow = document.createElement('tr');
                        sRow.innerHTML = '<td><code>' + r.payload.replace(/</g, '&lt;') + '</code></td>' +
                                         '<td class="status-' + r.status + '">' + r.status + '</td>' +
                                         '<td><span class="badge ' + r.badgeClass + '">' + r.label + '</span></td>';
                        resBody.appendChild(sRow);
                    }

                    btn.disabled = false;
                    btn.innerText = '✅ Attack Finished (Sorted)';
                    btn.style.background = '#28a745';

                    // Show Recommended Payload if body and onresize are allowed
                    const hasBody = results.some(function(r) { return r.payload === '<body>' && r.status === 200; });
                    const hasResize = results.some(function(r) { return r.payload === 'body onresize=' && r.status === 200; });
                    
                    if (hasBody && hasResize) {
                        document.getElementById('recommended-payload').style.display = 'block';
                        document.getElementById('payload-code').innerText = '<body onresize=print()>';
                    }
                } catch (err) {
                    alert('Error starting attack: ' + err.message);
                    console.error(err);
                }
            }
        </script>
    </body>
    </html>
    `);
});

// LAB 3: Reflected XSS with Custom Tags
app.get('/lab/custom-tags', (req, res) => {
    res.setHeader('X-XSS-Protection', '0');
    const s = req.query.search || '';
    
    // WAF Logic for Lab 3 (Blocks standard tags, allows custom)
    const standardTags = ['script', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'img', 'body', 'html', 'head', 'style', 'iframe', 'a', 'button', 'input', 'form', 'textarea', 'select', 'option', 'svg', 'canvas', 'video', 'audio', 'details', 'summary'];
    const allowedAttributes = ['onfocus', 'onmouseover', 'id', 'tabindex', 'class', 'style', 'name', 'value', 'type'];

    let err = null;
    const tagMatch = s.match(/<([a-zA-Z0-9-]+)/g);
    if (tagMatch) {
        for (let t of tagMatch) {
            let n = t.substring(1).toLowerCase();
            if (standardTags.includes(n)) { err = `Standard tag <${n}> is blocked!`; break; }
        }
    }
    const attrMatch = s.match(/([a-zA-Z0-9]+)\s*=/g);
    if (attrMatch && !err) {
        for (let a of attrMatch) {
            let n = a.split('=')[0].trim().toLowerCase();
            if (!allowedAttributes.includes(n)) { err = `Attribute ${n} is blocked!`; break; }
        }
    }

    if (err) {
        return res.status(400).send(`
            <div style="font-family: sans-serif; padding: 20px;">
                <h1 style="font-size: 32px; font-weight: bold;">Client Error: Forbidden</h1>
            </div>
        `);
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Lab 3 - Custom Tags</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background-color: #f0f2f5; }
            .nav-bar { background: #37475a; color: white; padding: 10px 20px; font-size: 14px; border-bottom: 3px solid #ff6600; }
            .split-container { display: flex; max-width: 1600px; margin: 0 auto; gap: 30px; padding: 20px; align-items: flex-start; }
            .lab-panel { flex: 1; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .solution-sidebar { width: 450px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); position: sticky; top: 20px; }
            input[type="text"] { width: 70%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
            button { padding: 12px 24px; background-color: #ff6600; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
            .badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; text-transform: uppercase; font-weight: bold; }
            .badge-allowed { background: #d4edda; color: #155724; }
            .badge-blocked { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="nav-bar">
            <span>Reflected XSS into HTML context with all tags blocked except custom ones</span>
        </div>
        <div class="container" style="text-align:left; border-radius:0; box-shadow:none; border-bottom:1px solid #ccc; padding: 10px 30px; background: #fff;">
            <div style="display:flex; align-items:center; gap:20px;">
                <a href="/" style="color:#ff6600; text-decoration:none; font-weight:bold; font-size:20px;">🏠 Home</a>
                <div style="height:20px; border-left:1px solid #ccc;"></div>
                <a href="/exploit-editor" style="background:#ff6600; color:white; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:2px;">Go to exploit server</a>
            </div>
        </div>

        <div class="split-container">
            <div class="lab-panel">
                <h2 style="color:#ff6600; margin-top:0;">Lab: Reflected XSS into HTML context with all tags blocked except custom ones</h2>
                <p style="background:#eef2f5;padding:15px;border-left:5px solid #ff6600;">Inject a custom tag and automatically alert <code>document.cookie</code> without user interaction.</p>
                <form action="/lab/custom-tags" method="GET">
                    <input type="text" name="search" placeholder="Search..." value="${s.replace(/"/g, '&quot;')}">
                    <button type="submit">Search</button>
                </form>

                ${s ? `
                    <div style="margin-top:20px;">
                        <section class="blog-header" style="padding: 20px 0; border-bottom: 1px solid #eee;">
                            <h1 style="font-weight: normal; margin: 0; color: #333; font-size: 28px;">
                                0 search results for '${s}'
                            </h1>
                            <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;">
                        </section>
                        
                        <div style="margin-top: 30px; border: 1px solid #333; border-radius: 4px; overflow: hidden; font-family: monospace; font-size: 13px; background: #282c34; color: #abb2bf; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                            <div style="background: #21252b; padding: 8px 15px; border-bottom: 1px solid #181a1f; color: #d7dae0; display: flex; align-items: center; gap: 10px; font-weight: bold;">
                                <span>🔍 DOM Inspector</span>
                            </div>
                            <div style="padding: 15px; line-height: 1.5; white-space: pre; overflow-x: auto;">
<span style="color: #e06c75;">&lt;section</span> <span style="color: #d19a66;">class</span>=<span style="color: #98c379;">"blog-header"</span><span style="color: #e06c75;">&gt;</span>
    <span style="color: #e06c75;">&lt;h1&gt;</span>
        0 search results for '
        <span style="background: rgba(255,255,255,0.1); padding: 2px; border-radius: 2px;">${s.replace(/</g, '&lt;')}</span>'
    <span style="color: #e06c75;">&lt;/h1&gt;</span>
    <span style="color: #e06c75;">&lt;hr&gt;</span>
<span style="color: #e06c75;">&lt;/section&gt;</span></div>
                        </div>
                    </div>
                ` : ''}
            <div class="intruder">
                <h3>🛠️ Simulated Intruder</h3>
                <button onclick="start()" id="btn" style="background:#2c3e50;color:white;border:none;padding:10px;cursor:pointer;">Start Attack</button>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:15px;text-align:left;">
                    <div class="list" style="height:120px; overflow-y:scroll; background:#f8f9fa; border:1px solid #ddd; padding:10px; font-family:monospace; font-size:12px; color:#666;" id="tags">script, div, p, h1, h2, span, img, body, html, iframe, a, button, input, xss, custom-tag, my-element</div>
                    <div class="list" style="height:120px; overflow-y:scroll; background:#f8f9fa; border:1px solid #ddd; padding:10px; font-family:monospace; font-size:12px; color:#666;" id="events">onclick, onmouseover, onerror, onload, onfocus, onblur, onchange, onsubmit, tabindex, id</div>
                </div>
                <style>
                    .badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; text-transform: uppercase; font-weight: bold; }
                    .badge-allowed { background: #d4edda; color: #155724; }
                    .badge-blocked { background: #f8d7da; color: #721c24; }
                </style>
                <table id="tbl" style="display:none; width:100%; border-collapse:collapse; margin-top:20px; border:1px solid #ddd; font-size:14px;">
                    <thead>
                        <tr>
                            <th style="background:#f2f2f2;padding:12px;border:1px solid #ddd;text-align:left;">Payload</th>
                            <th style="background:#f2f2f2;padding:12px;border:1px solid #ddd;text-align:left;">Status Code</th>
                            <th style="background:#f2f2f2;padding:12px;border:1px solid #ddd;text-align:left;">Result</th>
                        </tr>
                    </thead>
                    <tbody id="res"></tbody>
                </table>
                <div id="recommended-payload" style="display:none;margin-top:25px;padding:20px;background:#e7f3ff;border:1px solid #b8daff;border-radius:8px;text-align:left;">
                    <h4 style="margin-top:0;color:#004085;">🎯 Identified Exploit Pattern</h4>
                    <p>The intruder found that standard tags are blocked, but <strong>custom tags</strong> and <strong>onfocus</strong> are allowed!</p>
                    <div style="background:#fff;padding:10px;border:1px solid #ddd;border-radius:4px;font-family:monospace;font-size:16px;color:#d63384;">
                        <code id="payload-code">&lt;xss id=x onfocus=alert(document.cookie) tabindex=1&gt;#x</code>
                    </div>
                </div>
            </div>
            <script>
                async function start() {
                    const btn = document.getElementById('btn');
                    const resBody = document.getElementById('res');
                    const tbl = document.getElementById('tbl');
                    
                    btn.disabled = true;
                    btn.innerText = '🚀 Attacking...';
                    tbl.style.display = "table";
                    resBody.innerHTML = '';

                    const tags = document.getElementById('tags').innerText.split(',').map(x => '<' + x.trim() + '>');
                    const events = document.getElementById('events').innerText.split(',').map(x => 'xss ' + x.trim() + '=');
                    const payloads = tags.concat(events);

                    for (let p of payloads) {
                        const response = await fetch('/lab/custom-tags?search=' + encodeURIComponent(p));
                        const status = response.status;
                        const label = (status === 200 ? 'Allowed' : 'Blocked');
                        const bClass = (status === 200 ? 'badge-allowed' : 'badge-blocked');
                        
                        const row = document.createElement('tr');
                        row.innerHTML = '<td><code>' + p.replace(/</g, '&lt;') + '</code></td>' +
                                        '<td style="color:' + (status === 200 ? '#28a745' : '#dc3545') + '">' + status + '</td>' +
                                        '<td><span class="badge ' + bClass + '">' + label + '</span></td>';
                        resBody.appendChild(row);
                        await new Promise(r => setTimeout(r, 10));
                    }

                    btn.disabled = false;
                    btn.innerText = '✅ Attack Finished';
                    btn.style.background = '#28a745';
                    document.getElementById('recommended-payload').style.display = 'block';
                }
            </script>
            </div>
            <div class="solution-sidebar">
                ${labs[2].full_description}
            </div>
        </div>
    </body>
    </html>
    `);
});

// EXPLOIT SERVER (Authentic PortSwigger Experience)
app.get('/exploit', (req, res) => {
    // This is the endpoint the victim visits
    res.send(savedExploit);
});

app.get('/exploit-editor', (req, res) => {
    // This is the UI where you craft the exploit
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Exploit Server</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background-color: #f0f2f5; color: #333; }
            .header { background: #232f3e; color: #fff; padding: 20px; border-bottom: 4px solid #ff6600; }
            .header h1 { margin: 0; font-size: 28px; }
            .container { max-width: 1000px; margin: 30px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .info-box { background: #e7f3ff; border: 1px solid #b8daff; padding: 15px; border-radius: 4px; margin-bottom: 25px; font-size: 14px; }
            h2 { color: #ff6600; margin-top: 0; }
            label { display: block; font-weight: bold; margin: 15px 0 5px; color: #555; }
            textarea { width: 100%; height: 250px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; font-family: 'Consolas', monospace; font-size: 14px; box-sizing: border-box; }
            .btn-group { margin-top: 25px; display: flex; gap: 10px; }
            .btn { padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; }
            .btn-orange { background: #ff6600; color: white; }
            .btn-gray { background: #37475a; color: white; }
            .btn-blue { background: #007bff; color: white; }
            .url-display { background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="header"><h1>Web Security Academy - Exploit Server</h1></div>
        <div class="container">
            <h2>Craft a response</h2>
            <div class="info-box">
                <strong>How to use:</strong><br>
                1. Enter your <code>&lt;iframe&gt;</code> exploit payload in the <b>Body</b> section below.<br>
                2. Click <b>Store</b> to save it to this server.<br>
                3. Click <b>View Exploit</b> or <b>Deliver</b> to trigger the XSS on the victim's end.
            </div>
            
            <div class="url-display">
                <strong>Victim URL (The link they open):</strong> http://localhost:3000/exploit
            </div>

            <form action="/exploit/save" method="POST">
                <label>File:</label>
                <input type="text" value="/exploit" disabled style="width:100%; padding:8px; border:1px solid #ddd; background:#eee;">
                
                <label>Head:</label>
                <textarea style="height:80px;" disabled>HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8</textarea>

                <label>Body:</label>
                <textarea name="payload" id="payload-text">${savedExploit.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-orange">Store</button>
                    <a href="/exploit" target="_blank" class="btn btn-gray">View Exploit</a>
                    <button type="button" class="btn btn-blue" onclick="window.open('/exploit', '_blank'); alert('Exploit delivered! Victim is opening http://localhost:3000/exploit now.')">Deliver exploit to victim</button>
                </div>
            </form>
        </div>
    </body>
    </html>
    `);
});

app.post('/exploit/save', (req, res) => {
    savedExploit = req.body.payload;
    console.log('Exploit Saved:', savedExploit);
    res.redirect('/exploit-editor?saved=true');
});

app.listen(port, () => {
    console.log(`Lab running at http://localhost:${port}`);
});
