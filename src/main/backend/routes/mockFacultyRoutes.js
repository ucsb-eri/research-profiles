//mock backend endpoints using faculty fixtures

// GET /api/faculty
router.get('/', (req, res) => {
  const { department, topic } = req.query;

  let result = faculty;

  //filter by dept if field is provided
  if (department) {
    result = result.filter(f =>
      f.department.toLowerCase() === department.toLowerCase()
    );
  }

  //filter by topic if field is provided
  if (topic) {
    result = result.filter(f =>
      (f.topics || []).some(t =>
        t.toLowerCase().includes(topic.toLowerCase())
      )
    );
  }
  // return the filtered results as JSON obj
  res.json(result);
});

// GET /api/faculty/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const prof = faculty.find(f => f.id === id);

  if (!prof) {
    return res.status(404).json({ error: 'Faculty member not found' });
  }

  res.json(prof);
});

//GET /api/faculty/name
router.get('/name', (req, res) => {
  const { query } = req.query;
  const prof = faculty.find(f => f.name.toLowerCase().includes(query.toLowerCase()));

  if (!prof) {
    return res.status(404).json({ error: 'Faculty member not found' });
  }

  res.json(prof);
});