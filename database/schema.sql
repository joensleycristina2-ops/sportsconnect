-- Azure SQL Database schema for SportsConnect
CREATE TABLE Users (
  Id NVARCHAR(128) NOT NULL PRIMARY KEY,          -- user id from the sign-in provider
  Name NVARCHAR(100) NOT NULL,
  Email NVARCHAR(256) NOT NULL,                   -- not unique: one person can sign in with two providers
  Sport NVARCHAR(50) NULL,
  Level NVARCHAR(20) NULL,
  Area NVARCHAR(100) NULL,                        -- general area, shown to others
  Availability NVARCHAR(MAX) NULL,                -- JSON list such as ["Mon-Morning"]
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Users_Email ON Users (Email);

CREATE TABLE Activities (
  Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
  OrganizerId NVARCHAR(128) NOT NULL REFERENCES Users(Id),
  Title NVARCHAR(120) NOT NULL,
  Sport NVARCHAR(50) NOT NULL,
  Level NVARCHAR(20) NOT NULL,
  Area NVARCHAR(100) NOT NULL,                    -- shown to everyone
  Place NVARCHAR(200) NOT NULL,                   -- exact place, only returned to confirmed participants
  StartsAt DATETIME2 NOT NULL,                   -- UTC
  MaxParticipants INT NOT NULL CHECK (MaxParticipants >= 2)
);
CREATE INDEX IX_Activities_StartsAt ON Activities (StartsAt);

CREATE TABLE Participants (
  ActivityId UNIQUEIDENTIFIER NOT NULL REFERENCES Activities(Id) ON DELETE CASCADE,
  UserId NVARCHAR(128) NOT NULL REFERENCES Users(Id),
  Status VARCHAR(10) NOT NULL CHECK (Status IN ('confirmed', 'waiting')),
  JoinedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  PRIMARY KEY (ActivityId, UserId)
);

CREATE TABLE Invitations (
  Id INT IDENTITY PRIMARY KEY,
  ActivityId UNIQUEIDENTIFIER NOT NULL REFERENCES Activities(Id) ON DELETE CASCADE,
  InviteeEmail NVARCHAR(256) NOT NULL,
  Status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'accepted', 'declined')),
  Reason NVARCHAR(300) NULL,
  UNIQUE (ActivityId, InviteeEmail)
);
CREATE INDEX IX_Invitations_Email ON Invitations (InviteeEmail);

CREATE TABLE Notifications (
  Id INT IDENTITY PRIMARY KEY,
  UserId NVARCHAR(128) NOT NULL REFERENCES Users(Id),
  Text NVARCHAR(300) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Notifications_User ON Notifications (UserId, CreatedAt DESC);

CREATE TABLE Reports (
  Id INT IDENTITY PRIMARY KEY,
  ReporterId NVARCHAR(128) NOT NULL REFERENCES Users(Id),
  ActivityId UNIQUEIDENTIFIER NULL REFERENCES Activities(Id) ON DELETE SET NULL,
  Reason NVARCHAR(50) NOT NULL,
  Details NVARCHAR(500) NULL,
  Status VARCHAR(10) NOT NULL DEFAULT 'open',     -- reviewed by a moderator
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Blocks (
  BlockerId NVARCHAR(128) NOT NULL REFERENCES Users(Id),
  BlockedId NVARCHAR(128) NOT NULL REFERENCES Users(Id),
  PRIMARY KEY (BlockerId, BlockedId)
);
