<?php
namespace Tests\Support;
class StrictCsrf extends \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken {
 protected function runningUnitTests(){return false;}
}
