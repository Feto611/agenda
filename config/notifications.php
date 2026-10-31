<?php
return ['smtp_hosts'=>array_values(array_filter(array_map('trim',explode(',',env('SMTP_ALLOWED_HOSTS','smtp.resend.com,smtp.postmarkapp.com,smtp.mailgun.org,smtp.eu.mailgun.org,smtp.sendgrid.net,smtp-relay.brevo.com,smtp.gmail.com,smtp.office365.com,email-smtp.us-east-1.amazonaws.com')))))];
