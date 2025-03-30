import React, { useState, useEffect } from 'react';
import { Form, Button, InputGroup, Alert, Card, Tab, Tabs, Modal } from 'react-bootstrap';

export default function RegexPatternManager({ patterns = [], onChange, onDelete }) {
  const [regexPatterns, setRegexPatterns] = useState(patterns);
  const [testString, setTestString] = useState('');
  const [testResults, setTestResults] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  // Modal state for adding new patterns
  const [showAddModal, setShowAddModal] = useState(false);
  const [draftPattern, setDraftPattern] = useState(null);

  // Separate custom and global patterns
  const customPatterns = regexPatterns.filter(pattern => !pattern.isGlobal);
  const globalPatterns = regexPatterns.filter(pattern => pattern.isGlobal);


  // Update component when patterns prop changes
  useEffect(() => {
    console.log('Updating regex patterns from props:', patterns);
    setRegexPatterns(patterns);
  }, [patterns]);

  const addPattern = () => {
    // Instead of immediately adding to state, open a modal with draft pattern
    const newPattern = {
      id: Date.now().toString(),
      name: '',
      pattern: '',
      enabled: true,
      isGlobal: false // New patterns created here are not global
    };
    setDraftPattern(newPattern);
    setShowAddModal(true);
  };

  const saveNewPattern = () => {
    // Validate the pattern before saving
    if (!draftPattern.name.trim()) {
      alert("Pattern name is required");
      return;
    }

    try {
      if (draftPattern.pattern) {
        new RegExp(draftPattern.pattern);
      }
    } catch (e) {
      alert(`Invalid regex pattern: ${e.message}`);
      return;
    }

    // Add the new pattern to the list
    const updatedPatterns = [...regexPatterns, draftPattern];
    setRegexPatterns(updatedPatterns);
    if (onChange) onChange(updatedPatterns);

    // Close the modal and reset draft
    setShowAddModal(false);
    setDraftPattern(null);
  };

  const cancelAddPattern = () => {
    setShowAddModal(false);
    setDraftPattern(null);
  };

  const updateDraftPattern = (field, value) => {
    setDraftPattern({
      ...draftPattern,
      [field]: value
    });
  };

  const removePattern = (index, patternArray) => {
    // Get the actual pattern object
    const patternToRemove = patternArray[index];

    // If it's a global pattern, don't allow deletion
    if (patternToRemove.isGlobal && patternToRemove.isDefault) {
      alert("Default global patterns cannot be deleted. They can only be managed in the Global Pattern Repository.");
      return;
    }

    // Notify parent component about deletion
    if (onDelete) {
      onDelete(patternToRemove);
      return;
    }

    // Create new array without the removed pattern
    const updatedPatterns = regexPatterns.filter(p => p.id !== patternToRemove.id);
    setRegexPatterns(updatedPatterns);
    if (onChange) onChange(updatedPatterns);
  };

  const updatePattern = (index, field, value, patternArray) => {
    // Get the actual pattern object
    const patternToUpdate = patternArray[index];

    // If it's a global pattern and trying to edit anything other than 'enabled', prevent it
    if (patternToUpdate.isGlobal && field !== 'enabled') {
      alert("Global patterns cannot be edited. They can only be enabled/disabled here.");
      return;
    }

    console.log(`Updating pattern ${patternToUpdate.id}, field ${field} to ${value}`);

    // Create updated patterns array
    const updatedPatterns = regexPatterns.map(p => {
      if (p.id === patternToUpdate.id) {
        return {
          ...p,
          [field]: value
        };
      }
      return p;
    });

    // Validate regex if pattern field changes
    if (field === 'pattern') {
      try {
        new RegExp(value);
        // Clear validation error for this pattern ID
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[patternToUpdate.id];
          return newErrors;
        });
      } catch (e) {
        // Set validation error for this pattern ID
        setValidationErrors(prev => ({
          ...prev,
          [patternToUpdate.id]: e.message
        }));
      }
    }
    console.log('Updated patterns:', updatedPatterns);

    if (onChange) {
      console.log('Notifying parent of pattern changes:', updatedPatterns);
      onChange(updatedPatterns);
    }

    console.log('Updated regex patterns:', regexPatterns);

    // Then notify parent component of change

  };

  const testPatterns = () => {
    if (!testString) return;

    const results = {};
    regexPatterns.forEach((patternObj) => {
      if (!patternObj.pattern || !patternObj.enabled) {
        results[patternObj.id] = { matches: false, error: null };
        return;
      }

      try {
        const regex = new RegExp(patternObj.pattern, 'g');
        const matches = testString.match(regex);
        results[patternObj.id] = {
          matches: matches !== null && matches.length > 0,
          matchCount: matches ? matches.length : 0,
          matchedText: matches || []
        };
      } catch (e) {
        results[patternObj.id] = { matches: false, error: e.message };
      }
    });

    setTestResults(results);
  };

  // Function to render pattern cards with appropriate permissions
  const renderPatternCard = (patternObj, index, patternArray, isGlobal) => (
    <Card key={patternObj.id || index} className="mb-3 pattern-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <Form.Group className="flex-grow-1 me-2">
            <Form.Label>Pattern Name</Form.Label>
            <Form.Control
              type="text"
              value={patternObj.name}
              onChange={(e) => updatePattern(index, 'name', e.target.value, patternArray)}
              placeholder="Pattern name"
              isInvalid={!patternObj.name}
              disabled={isGlobal}
              readOnly={isGlobal}
            />
            {!patternObj.name && (
              <Form.Control.Feedback type="invalid">
                Name is required
              </Form.Control.Feedback>
            )}
          </Form.Group>

          {!isGlobal && (
            <Button
              variant="outline-danger"
              onClick={() => removePattern(index, patternArray)}
              className="mt-4"
            >
              Remove
            </Button>
          )}
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Sample Data</Form.Label>
          <Form.Control
            type="text"
            value={patternObj.sampleData || ''}
            onChange={(e) => updatePattern(index, 'sampleData', e.target.value, patternArray)}
            placeholder="Example data that matches this pattern"
            disabled={isGlobal}
            readOnly={isGlobal}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Regex Pattern</Form.Label>
          <Form.Control
            type="text"
            value={patternObj.pattern}
            onChange={(e) => updatePattern(index, 'pattern', e.target.value, patternArray)}
            placeholder="Regular expression pattern"
            isInvalid={validationErrors[patternObj.id]}
            disabled={isGlobal}
            readOnly={isGlobal}
          />
          {validationErrors[patternObj.id] && (
            <Form.Control.Feedback type="invalid">
              {validationErrors[patternObj.id]}
            </Form.Control.Feedback>
          )}
        </Form.Group>

        <Form.Check
          type="switch"
          id={`pattern-enabled-${patternObj.id}`}
          label="Enabled"
          checked={patternObj.enabled}
          onChange={(e) => {
            console.log(`Toggling ${patternObj.id} to ${e.target.checked}`);
            updatePattern(index, 'enabled', e.target.checked, patternArray);
          }}
        />

        {/* Test results */}
        {testResults[patternObj.id] && (
          <div className="mt-2 test-results">
            {testResults[patternObj.id].error ? (
              <Alert variant="danger">
                Error: {testResults[patternObj.id].error}
              </Alert>
            ) : (
              <Alert variant={testResults[patternObj.id].matches ? "success" : "warning"}>
                {testResults[patternObj.id].matches
                  ? `✓ Matches (${testResults[patternObj.id].matchCount}): ${testResults[patternObj.id].matchedText.join(', ')}`
                  : '✗ No matches found'}
              </Alert>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <div className="regex-pattern-manager">
      <h4>Regex Pattern Management</h4>

      {/* Test area for regex patterns */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Test Regex Patterns</Card.Title>
          <Form.Group className="mb-3">
            <Form.Label>Test String</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter text to test against your regex patterns"
            />
          </Form.Group>
          <Button
            variant="primary"
            onClick={testPatterns}
            disabled={regexPatterns.length === 0 || !testString}
          >
            Test Patterns
          </Button>
        </Card.Body>
      </Card>

      {/* Split into tabs for custom and global patterns */}
      <Tabs defaultActiveKey="custom" id="pattern-tabs" className="mb-3">
        <Tab eventKey="custom" title="Custom Regex Patterns">
          <div className="patterns-list mb-3">
            {customPatterns.map((patternObj, index) =>
              renderPatternCard(patternObj, index, customPatterns, false)
            )}
          </div>

          <Button
            variant="success"
            className="add-pattern"
            onClick={addPattern}
          >
            + Add Custom Regex Pattern
          </Button>
        </Tab>

        <Tab eventKey="global" title="Global Regex Patterns">
          <div className="global-patterns-info alert alert-info">
            <p className="mb-0">
              <strong>Note:</strong> Global patterns can only be enabled or disabled here.
              To modify or delete global patterns, please use the Global Pattern Repository.
            </p>
          </div>

          <div className="patterns-list mb-3">
            {globalPatterns.length > 0 ? (
              globalPatterns.map((patternObj, index) =>
                renderPatternCard(patternObj, index, globalPatterns, true)
              )
            ) : (
              <Alert variant="secondary">No global patterns available.</Alert>
            )}
          </div>
        </Tab>
      </Tabs>

      {/* Modal for adding new patterns */}
      <Modal show={showAddModal} onHide={cancelAddPattern}>
        <Modal.Header closeButton>
          <Modal.Title>Add Custom Regex Pattern</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {draftPattern && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Pattern Name</Form.Label>
                <Form.Control
                  type="text"
                  value={draftPattern.name}
                  onChange={(e) => updateDraftPattern('name', e.target.value)}
                  placeholder="Pattern name"
                  isInvalid={!draftPattern.name}
                />
                {!draftPattern.name && (
                  <Form.Control.Feedback type="invalid">
                    Name is required
                  </Form.Control.Feedback>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Regex Pattern</Form.Label>
                <Form.Control
                  type="text"
                  value={draftPattern.pattern}
                  onChange={(e) => updateDraftPattern('pattern', e.target.value)}
                  placeholder="Regular expression pattern"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Sample Data</Form.Label>
                <Form.Control
                  type="text"
                  value={draftPattern.sampleData || ''}
                  onChange={(e) => updateDraftPattern('sampleData', e.target.value)}
                  placeholder="Example data that matches this pattern"
                />
              </Form.Group>

              <Form.Check
                type="switch"
                id="draft-pattern-enabled"
                label="Enabled"
                checked={draftPattern.enabled}
                onChange={(e) => updateDraftPattern('enabled', e.target.checked)}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelAddPattern}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveNewPattern}>
            Save Pattern
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}