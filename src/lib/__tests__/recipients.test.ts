import { parseRecipients } from '../recipients';

describe('parseRecipients', () => {
  it('parses a single address', () => {
    expect(parseRecipients('info@theheuristicacademy.com')).toEqual(['info@theheuristicacademy.com']);
  });

  it('parses a comma-separated list and trims spaces', () => {
    expect(parseRecipients('a@x.com, b@y.org ,c@z.io')).toEqual(['a@x.com', 'b@y.org', 'c@z.io']);
  });

  it('removes duplicates', () => {
    expect(parseRecipients('a@x.com,a@x.com')).toEqual(['a@x.com']);
  });

  it('returns null for empty or missing input', () => {
    expect(parseRecipients(undefined)).toBeNull();
    expect(parseRecipients('')).toBeNull();
    expect(parseRecipients(' , ')).toBeNull();
  });

  it('rejects the whole list if any entry is not a plain address', () => {
    expect(parseRecipients('a@x.com,not-an-address')).toBeNull();
    expect(parseRecipients('Name <a@x.com>')).toBeNull();
    expect(parseRecipients('a@x.com\nBcc: evil@x.com')).toBeNull();
  });
});
