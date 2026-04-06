python

![alt text](image.png)

Port Swigger 

Go to JSON Editors Keys >> New RSA Key >> Generate JWK
Paste in to Exploit Server of Portswigger & copy the KID 

![alt text](image-1.png)

In Request, Go to JSON Web Token
paste the Kid in JWS header 
& also in JWS Header the 'jku":"exploitserver url"

In pay load rename sub to admininistrator
> Sign & Send


JWT_Tool
![alt text](image-2.png)

cpoy the json paste into exploit server > store ir

![alt text](image-3.png)


