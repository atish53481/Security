const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PortSwigger Security Labs</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                background-color: #f4f4f9;
            }
            .header {
                background: #333;
                color: #fff;
                padding: 15px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                color: #ff6600;
            }
            .tabs {
                display: flex;
                background: #444;
            }
            .tabs a {
                padding: 15px 20px;
                color: white;
                text-decoration: none;
                background: #444;
                border-right: 1px solid #555;
            }
            .tabs a:hover {
                background: #555;
            }
            .container {
                max-width: 800px;
                margin: 40px auto;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Reflected XXS</h1>
        </div>
        <div class="tabs">
            <a href="/lab/reflected-xss">Lab 1: Reflected XSS into HTML context with nothing encoded</a>
        </div>
        <div class="container">
            <h2>Welcome to the Security Labs</h2>
            <p>Please select a tab from the navigation bar above to begin a lab.</p>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

app.get('/lab/reflected-xss', (req, res) => {
    const searchQuery = req.query.search;
    
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reflected XSS Lab</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                background-color: #f4f4f9;
            }
            .header {
                background: #333;
                color: #fff;
                padding: 15px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                color: #ff6600;
            }
            .tabs {
                display: flex;
                background: #444;
                border-bottom: 3px solid #ff6600;
            }
            .tabs a {
                padding: 15px 20px;
                color: white;
                text-decoration: none;
                background: #ff6600; /* Active tab */
            }
            .container {
                max-width: 800px;
                margin: 40px auto;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            h1 { color: #333; }
            form { margin-bottom: 20px; }
            input[type="text"] {
                width: 70%; padding: 10px; font-size: 16px;
                border: 1px solid #ccc; border-radius: 4px;
            }
            button {
                padding: 10px 20px; font-size: 16px; background-color: #ff6600;
                color: white; border: none; border-radius: 4px; cursor: pointer;
            }
            button:hover { background-color: #e65c00; }
            .result {
                padding: 15px; background-color: #fff3cd; border: 1px solid #ffeeba;
                border-radius: 4px; margin-top: 20px;
            }
            .code-block {
                background: #eee; padding: 10px; border-radius: 4px;
                font-family: monospace; display: block; overflow-x: auto;
                color: #d14; border: 1px solid #ccc;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Reflected XXS</h1>
        </div>
        <div class="tabs">
            <a href="/lab/reflected-xss">Lab 1: Reflected XSS into HTML context with nothing encoded</a>
        </div>
        <div class="container">
            <details style="margin-bottom: 20px; text-align: left; background-color: #eef2f5; padding: 10px; border-radius: 4px;">
                <summary style="color: #2c3e50; font-size: 16px; font-weight: bold; cursor: pointer; list-style-position: inside;">Lab Description & Details</summary>
                <div style="margin-top: 10px; font-size: 14px; line-height: 1.6; color: #333;">
                    <p><strong>Vulnerability:</strong> Reflected Cross-Site Scripting (XSS)</p>
                    <p><strong>Context:</strong> HTML context with nothing encoded</p>
                    <p><strong>Description:</strong> This lab contains a simple reflected cross-site scripting vulnerability in the search functionality. The application receives input from the search parameter and echoes it directly into the HTML response without any sanitization or encoding. Because it is directly reflected into the HTML body context, any HTML or JavaScript supplied by the user will be executed by the browser.</p>
                    <p><strong>Goal:</strong> To solve the lab, perform a cross-site scripting attack that calls the <code>alert</code> function.</p>
                </div>
            </details>
            <form action="/lab/reflected-xss" method="GET">
                <input type="text" name="search" placeholder="Search the blog..." value="${searchQuery ? searchQuery.replace(/"/g, '&quot;') : ''}">
                <button type="submit">Search</button>
            </form>
    `;

    if (searchQuery) {
        // VULNERABILITY: User input is directly appended to the HTML context without encoding.
        
        // We use this safe escape just to visually show the payload in a nice block for the UI explanation
        const escapedSearchQuery = searchQuery.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        html += `<div class="result">
                    <h3>0 search results for:</h3>
                    <!-- Reflected explicitly in the DOM so user can see it -->
                    <span class="code-block">${escapedSearchQuery}</span>
                    
                    <hr style="margin:20px 0; border:0; border-top:1px solid #ccc;">
                    
                    <h3>DOM Reflection Engine (Vulnerable area)</h3>
                    <p>The inputted payload executes here because it's rendered normally in the DOM:</p>
                    
                    <div>${searchQuery}</div>
                 </div>`;
    }

    html += `
        </div>

        <div class="container" style="margin-top: 20px; background-color: #eef2f5;">
            <details>
                <summary style="color: #2c3e50; font-size: 20px; font-weight: bold; cursor: pointer; border-bottom: 2px solid #bdc3c7; padding-bottom: 10px; list-style-position: inside;">View Cheat Sheet: Reflected XSS (Nothing Encoded)</summary>
                <div style="margin-top: 15px;">
                    <p>Here are some common payloads you can try in this lab environment:</p>
                    <ul>
                        <li style="margin-bottom: 10px;">
                            <strong>Basic Script Tag Execution:</strong>
                            <div class="code-block">&lt;script&gt;alert(1)&lt;/script&gt;</div>
                        </li>
                        <li style="margin-bottom: 10px;">
                            <strong>Image Onload Execution:</strong>
                            <div class="code-block">&lt;img src=x onerror=alert(1)&gt;</div>
                        </li>
                        <li style="margin-bottom: 10px;">
                            <strong>SVG Vector Execution:</strong>
                            <div class="code-block">&lt;svg onload=alert(1)&gt;</div>
                        </li>
                        <li style="margin-bottom: 10px;">
                            <strong>Body Onload Execution:</strong>
                            <div class="code-block">&lt;body onload=alert(1)&gt;</div>
                        </li>
                        <li style="margin-bottom: 10px;">
                            <strong>Iframe Execution:</strong>
                            <div class="code-block">&lt;iframe src="javascript:alert(1)"&gt;&lt;/iframe&gt;</div>
                        </li>
                    </ul>
                </div>
            </details>
        </div>
    </body>
    </html>
    `;

    res.send(html);
});

app.listen(port, () => {
    console.log(`Reflected XSS Lab running at http://localhost:${port}`);
});
