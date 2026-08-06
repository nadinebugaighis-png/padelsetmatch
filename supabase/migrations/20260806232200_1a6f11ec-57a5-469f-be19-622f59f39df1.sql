UPDATE public.app_events SET kind = 'event', name = 'hydration_mismatch'
WHERE kind IN ('crash','error')
  AND (message ILIKE '%Hydration failed because%'
       OR message ILIKE '%error while hydrating%'
       OR message ~ 'Minified React error #(418|423|425)');

DELETE FROM public.app_alerts
WHERE title ILIKE '%418%'
   OR title ILIKE '%Hydration%'
   OR title ILIKE '%Crash-free sessions dropped%';