<?php
return ['owner_registration'=>env('OWNER_REGISTRATION','invite'),'kind'=>env('APP_PORTAL','client'),'customer_url'=>rtrim(env('CUSTOMER_URL',env('APP_URL','http://localhost:8080')),'/'),'owner_url'=>rtrim(env('OWNER_URL','http://localhost:8081'),'/'),'owner_path'=>'/gestion'];
