-- YogaFlow seed practice content (Issue #8, YF-03; Plan §1.4 D4: 6 Yoga, 3 Breathwork, 3 Meditation).
-- GENERATED from supabase/seed/practices.json by `npm run seed:generate`. Do not edit by hand.
--
-- Applied ONLY by the project owner, after review, in the Supabase SQL Editor, after the
-- migration in supabase/migrations/. See docs/SUPABASE_SETUP.md. Safe to re-run (upsert by slug).
-- All text is AI-written draft content and stays is_placeholder = true until a human reviews it.

begin;

insert into public.practices (
  slug,
  title,
  type,
  difficulty,
  body_focus,
  summary,
  instructions,
  benefits,
  caution,
  image_path,
  image_alt,
  source,
  license,
  image_attribution,
  is_placeholder
)
values
  (
    'mountain-pose',
    'Mountain Pose',
    'Yoga',
    'Beginner',
    array[
      'Full Body'
    ]::text[],
    'A steady standing pose that builds awareness of posture and balance.',
    array[
      'Stand with your feet hip-width apart and your arms resting by your sides.',
      'Spread your toes and press evenly through both feet.',
      'Lengthen through the top of your head and relax your shoulders away from your ears.',
      'Let your arms hang naturally with your palms facing forward or in toward your body.',
      'Breathe slowly and evenly for five to eight breaths.'
    ]::text[],
    'Encourages body awareness and a calm, upright stance. Often used as a starting point for other standing poses.',
    'Keep your knees soft rather than locked. If you feel dizzy or unsteady, stand near a wall or a chair for support. Stop if you feel pain.',
    '/images/practices/mountain-pose.svg',
    'Placeholder illustration for Mountain Pose',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'childs-pose',
    'Child''s Pose',
    'Yoga',
    'Beginner',
    array[
      'Back',
      'Hips'
    ]::text[],
    'A gentle resting pose that folds the body forward over the knees.',
    array[
      'Kneel on a mat with your big toes touching and your knees comfortably apart.',
      'Sit your hips back toward your heels.',
      'Fold forward and rest your forehead on the mat, a cushion, or your stacked hands.',
      'Stretch your arms forward or rest them alongside your body.',
      'Breathe slowly into your back for five to ten breaths, then walk your hands back to sit up.'
    ]::text[],
    'Offers a quiet moment to rest and notice the breath. A gentle stretch for the back and hips.',
    'Place a cushion under your hips or between your heels and hips if kneeling feels uncomfortable. Move slowly and stop if you feel pain in your knees, hips, or back.',
    '/images/practices/childs-pose.svg',
    'Placeholder illustration for Child''s Pose',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'cat-cow',
    'Cat-Cow',
    'Yoga',
    'Beginner',
    array[
      'Back',
      'Core'
    ]::text[],
    'A flowing movement between two shapes on hands and knees, linked with the breath.',
    array[
      'Start on your hands and knees with your wrists under your shoulders and your knees under your hips.',
      'As you breathe in, let your belly lower, lift your chest, and look slightly forward.',
      'As you breathe out, press into your hands, round your back, and let your head relax down.',
      'Continue moving slowly between the two shapes, following your breath.',
      'Repeat for five to ten rounds, then return to a neutral back.'
    ]::text[],
    'Brings gentle movement to the spine and helps connect movement with breathing.',
    'Keep the movement small and comfortable. Fold your mat or add padding under your knees if needed. Stop if you feel pain in your wrists, knees, or back.',
    '/images/practices/cat-cow.svg',
    'Placeholder illustration for Cat-Cow',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'downward-facing-dog',
    'Downward-Facing Dog',
    'Yoga',
    'Beginner',
    array[
      'Shoulders',
      'Legs'
    ]::text[],
    'An upside-down V shape that stretches the back of the legs and engages the arms and shoulders.',
    array[
      'Start on your hands and knees with your hands slightly in front of your shoulders.',
      'Tuck your toes under and lift your knees off the mat.',
      'Press your hips up and back so your body forms an upside-down V.',
      'Keep your knees bent as much as you need so your back can stay long.',
      'Hold for three to five breaths, then lower your knees to rest.'
    ]::text[],
    'Stretches the back of the legs and builds strength in the arms and shoulders.',
    'Bend your knees generously and let your heels stay lifted. Come down to your knees whenever you need a break. Stop if you feel pain in your wrists, shoulders, or back.',
    '/images/practices/downward-facing-dog.svg',
    'Placeholder illustration for Downward-Facing Dog',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'warrior-ii',
    'Warrior II',
    'Yoga',
    'Beginner',
    array[
      'Legs',
      'Hips'
    ]::text[],
    'A wide standing pose with the arms stretched out to the sides and the front knee bent.',
    array[
      'Stand with your feet wide apart, about the length of one leg.',
      'Turn your right foot to point forward along the mat and your left foot slightly inward.',
      'Raise your arms to shoulder height, reaching out to the sides.',
      'Bend your right knee so it points over your right ankle, keeping your back leg straight.',
      'Look past your right hand and breathe for three to five breaths.',
      'Straighten your front leg, turn your feet, and repeat on the other side.'
    ]::text[],
    'Builds strength and steadiness in the legs and encourages an open, steady stance.',
    'Keep your front knee in line with your ankle and toes, and shorten your stance if it feels too deep. Lower your arms if your shoulders tire. Stop if you feel pain.',
    '/images/practices/warrior-ii.svg',
    'Placeholder illustration for Warrior II',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'plank-pose',
    'Plank Pose',
    'Yoga',
    'Intermediate',
    array[
      'Core',
      'Shoulders'
    ]::text[],
    'A strength-building pose that holds the body in one long line, supported by the hands and toes.',
    array[
      'Start on your hands and knees with your hands under your shoulders.',
      'Step your feet back one at a time so your body forms a straight line from head to heels.',
      'Press the floor away with your hands and gently draw your belly in.',
      'Keep your neck long and look at the floor slightly ahead of your hands.',
      'Hold for a few steady breaths, then lower your knees to rest.'
    ]::text[],
    'Builds strength in the core, arms, and shoulders and practices holding a steady position.',
    'Lower your knees to the mat to make the pose lighter. Avoid letting your hips sag or lift high. Stop if you feel pain in your wrists, shoulders, or lower back.',
    '/images/practices/plank-pose.svg',
    'Placeholder illustration for Plank Pose',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'belly-breathing',
    'Belly Breathing',
    'Breathwork',
    'Beginner',
    '{}'::text[],
    'A simple breathing practice that brings attention to the rise and fall of the belly.',
    array[
      'Sit comfortably or lie on your back with your knees bent.',
      'Place one hand on your chest and the other on your belly.',
      'Breathe in slowly through your nose and let your belly rise under your hand.',
      'Breathe out slowly and let your belly fall.',
      'Continue for one to three minutes at a relaxed, natural pace.'
    ]::text[],
    'Encourages slow, unhurried breathing and a moment of focused attention.',
    'Keep the breath gentle and never force it. If you feel lightheaded or uncomfortable, return to your normal breathing. Stop if you feel unwell.',
    '/images/practices/belly-breathing.svg',
    'Placeholder illustration for Belly Breathing',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'box-breathing',
    'Box Breathing',
    'Breathwork',
    'Beginner',
    '{}'::text[],
    'A steady breathing pattern of four equal parts: breathe in, hold, breathe out, hold.',
    array[
      'Sit upright in a comfortable position and relax your shoulders.',
      'Breathe in through your nose for a slow count of four.',
      'Gently hold your breath for a count of four.',
      'Breathe out slowly for a count of four.',
      'Pause for a count of four, then begin the next round.',
      'Repeat for four rounds, or for as long as it feels comfortable.'
    ]::text[],
    'Gives the mind a simple, steady rhythm to follow and can help you feel more settled.',
    'Shorten the counts or skip the holds if they feel uncomfortable. If you feel lightheaded or short of breath, return to your normal breathing. Stop if you feel unwell.',
    '/images/practices/box-breathing.svg',
    'Placeholder illustration for Box Breathing',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'extended-exhale-breathing',
    'Extended Exhale Breathing',
    'Breathwork',
    'Beginner',
    '{}'::text[],
    'A relaxed breathing practice in which each breath out is a little longer than the breath in.',
    array[
      'Sit or lie down comfortably and let your breathing settle.',
      'Breathe in through your nose for a count of three.',
      'Breathe out slowly through your nose or softly parted lips for a count of five.',
      'Keep the breath smooth and quiet, without straining.',
      'Continue for one to three minutes.'
    ]::text[],
    'Encourages an unhurried pace of breathing and can support a sense of calm.',
    'Choose counts that feel easy for you. If you feel lightheaded or short of breath, return to your normal breathing. Stop if you feel unwell.',
    '/images/practices/extended-exhale-breathing.svg',
    'Placeholder illustration for Extended Exhale Breathing',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'breath-awareness-meditation',
    'Breath Awareness Meditation',
    'Meditation',
    'Beginner',
    '{}'::text[],
    'A short meditation that uses the natural breath as a point of focus.',
    array[
      'Sit comfortably with your back upright and your hands resting in your lap.',
      'Close your eyes or soften your gaze toward the floor.',
      'Notice the breath moving in and out without trying to change it.',
      'When your mind wanders, gently bring your attention back to the breath.',
      'Continue for three to five minutes, then slowly open your eyes.'
    ]::text[],
    'Practices gently returning attention to the present moment.',
    'Keep your eyes open if closing them feels uncomfortable. If the practice brings up distress, open your eyes, take a break, or stop.',
    '/images/practices/breath-awareness-meditation.svg',
    'Placeholder illustration for Breath Awareness Meditation',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'body-scan-meditation',
    'Body Scan Meditation',
    'Meditation',
    'Beginner',
    '{}'::text[],
    'A guided-attention practice that moves slowly through the body from head to toe.',
    array[
      'Lie on your back or sit comfortably, and let your eyes close or rest your gaze downward.',
      'Take a few slow breaths and notice where your body touches the floor or chair.',
      'Bring your attention to the top of your head, then slowly move it down through your face, neck, and shoulders.',
      'Continue through your arms, chest, belly, hips, legs, and feet, simply noticing each area.',
      'Finish with a few breaths, noticing your whole body at once, then slowly open your eyes.'
    ]::text[],
    'Builds the habit of noticing sensations in the body with curiosity and without judgment.',
    'Change position whenever you need to. If focusing on any area brings up discomfort or distress, move your attention elsewhere, open your eyes, or stop.',
    '/images/practices/body-scan-meditation.svg',
    'Placeholder illustration for Body Scan Meditation',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  ),
  (
    'loving-kindness-meditation',
    'Loving-Kindness Meditation',
    'Meditation',
    'Beginner',
    '{}'::text[],
    'A meditation that silently repeats kind wishes for yourself and others.',
    array[
      'Sit comfortably and take a few slow, easy breaths.',
      'Silently repeat a few kind phrases for yourself, such as "May I be safe. May I be at ease."',
      'Bring to mind someone you care about and offer them the same wishes.',
      'If you like, extend the wishes to other people and, finally, to everyone.',
      'Rest quietly for a few breaths before opening your eyes.'
    ]::text[],
    'Practices bringing a friendly, patient attitude to yourself and others.',
    'There is no right way to feel during this practice. If it brings up difficult feelings, return to your breath, take a break, or stop.',
    '/images/practices/loving-kindness-meditation.svg',
    'Placeholder illustration for Loving-Kindness Meditation',
    'YogaFlow draft text (AI-written, not yet human-reviewed)',
    'Placeholder: not licensed for release until human review',
    'Placeholder graphic created for YogaFlow',
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  type = excluded.type,
  difficulty = excluded.difficulty,
  body_focus = excluded.body_focus,
  summary = excluded.summary,
  instructions = excluded.instructions,
  benefits = excluded.benefits,
  caution = excluded.caution,
  image_path = excluded.image_path,
  image_alt = excluded.image_alt,
  source = excluded.source,
  license = excluded.license,
  image_attribution = excluded.image_attribution,
  is_placeholder = excluded.is_placeholder;

commit;
