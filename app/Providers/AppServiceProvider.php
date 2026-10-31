<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\RateLimiter::for('checkout',fn(\Illuminate\Http\Request $r)=>\Illuminate\Cache\RateLimiting\Limit::perMinute(20)->by('checkout:'.$r->user()->id)->response(fn($r,$headers)=>response()->json(['message'=>'Has preparado varios pagos seguidos. Espera un momento antes de volver a intentarlo.','retry_after'=>(int)($headers['Retry-After']??60)],429,$headers)));
        \Illuminate\Support\Facades\RateLimiter::for('payment-actions',fn(\Illuminate\Http\Request $r)=>\Illuminate\Cache\RateLimiting\Limit::perMinute(30)->by('payment:'.$r->user()->id)->response(fn($r,$headers)=>response()->json(['message'=>'Estamos actualizando tu pago. Espera unos segundos.','retry_after'=>(int)($headers['Retry-After']??60)],429,$headers)));
        if(app()->environment('production')&&config('realtime.enabled')){
            $key=(string)config('broadcasting.connections.reverb.key');$secret=(string)config('broadcasting.connections.reverb.secret');
            if(strlen($key)<16||strlen($secret)<32||hash_equals($key,$secret))throw new \LogicException('Configura claves Reverb distintas: clave pública de al menos 16 caracteres y secreto de al menos 32.');
        }
        foreach([\App\Models\Venue::class,\App\Models\VenuePhoto::class,\App\Models\VenueReview::class,\App\Models\Booking::class,\App\Models\BookingPayment::class,\App\Models\MailNotification::class,\App\Models\CheckoutAttempt::class] as $model)$model::observe(\App\Observers\RealtimeObserver::class);
        // Never send the public session over HTTP when its configured URL is HTTPS.
        $url=config('portal.kind')==='owner'?config('portal.owner_url'):config('portal.customer_url');
        if(parse_url((string)$url,PHP_URL_SCHEME)==='https')config(['session.secure'=>true]);
    }
}
