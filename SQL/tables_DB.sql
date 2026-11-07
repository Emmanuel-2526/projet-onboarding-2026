USE [OnboardingDemo];
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SoftwareCatalogDemo' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.SoftwareCatalogDemo (
        IdApplication          BIGINT       NOT NULL,
        ApplicationName        VARCHAR(100) NULL,
        Price                  FLOAT        NULL,
        NbAvailable            INT          NULL,
        NbUsed                 INT          NULL,
        IdApplicationPriceType BIGINT       NULL,
        CONSTRAINT PK_SoftwareCatalogDemo PRIMARY KEY CLUSTERED (IdApplication)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Onboarder' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Onboarder (
        
        id_employee INT           IDENTITY(1,1) NOT NULL,
        LastName    NVARCHAR(100) NOT NULL,
        FirstName   NVARCHAR(100) NOT NULL,
        AccountName NVARCHAR(100) NULL,
        Company     NVARCHAR(100) NOT NULL,
        Initials    NVARCHAR(100) NOT NULL,
        JobTitle    NVARCHAR(200) NOT NULL,
        Team        NVARCHAR(100) NOT NULL,
        Manager     NVARCHAR(200) NOT NULL,
        Mail        NVARCHAR(200) NOT NULL,
        StartDate   DATETIME      NOT NULL,
        EndDate     DATETIME      NULL,
        CONSTRAINT PK_Onboarder PRIMARY KEY CLUSTERED (id_employee)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SoftwareRequest' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.SoftwareRequest (
        IdRequest         INT           IDENTITY(1,1) NOT NULL,
        DTRequest         DATETIME      NOT NULL DEFAULT (GETDATE()),
        IdRequester       NVARCHAR(100) NOT NULL,
        IdManager         NVARCHAR(100) NOT NULL,
        CurrentStep       TINYINT       NOT NULL DEFAULT (1),
        CurrentStatus     NVARCHAR(20)  NOT NULL DEFAULT ('Pending'),
        ReminderCount     TINYINT       NOT NULL DEFAULT (0),
        DTLastReminder    DATETIME      NULL,
        DTManagerDecision DATETIME      NULL,
        ManagerDecidedBy  NVARCHAR(200) NULL,
        CONSTRAINT PK_SoftwareRequest  PRIMARY KEY CLUSTERED (IdRequest),
        CONSTRAINT CK_SR_CurrentStep   CHECK (CurrentStep   IN (1, 2, 3)),
        CONSTRAINT CK_SR_CurrentStatus CHECK (CurrentStatus IN ('Pending', 'Approved', 'Refused'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Approval' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Approval (
        id_approval   INT           IDENTITY(1,1) NOT NULL,
        id_employee   INT           NULL,
        IdApplication BIGINT        NOT NULL,
        IdRequest     INT           NULL,
        ApprovalStep  TINYINT       NULL,
        DecidedBy     NVARCHAR(100) NULL,
        Status        NVARCHAR(20)  NOT NULL DEFAULT ('Pending'),
        DateRequest   DATETIME      NOT NULL DEFAULT (GETDATE()),
        DateResponse  DATETIME      NULL,
        Comments      NVARCHAR(MAX) NULL,
        TotalAmount   DECIMAL(10,2) NOT NULL DEFAULT (0),
        CONSTRAINT PK_Approval PRIMARY KEY CLUSTERED (id_approval),
        CONSTRAINT FK_Approval_Onboarder
            FOREIGN KEY (id_employee)   REFERENCES dbo.Onboarder(id_employee),
        CONSTRAINT FK_Approval_SoftwareCatalogDemo
            FOREIGN KEY (IdApplication) REFERENCES dbo.SoftwareCatalogDemo(IdApplication),
        CONSTRAINT FK_Approval_SoftwareRequest
            FOREIGN KEY (IdRequest)     REFERENCES dbo.SoftwareRequest(IdRequest),
        CONSTRAINT CK_Approval_Status
            CHECK (Status       IN ('Pending', 'Approved', 'Refused', 'Superseded')),
        CONSTRAINT CK_Approval_Step
            CHECK (ApprovalStep IN (1, 2, 3)),
        CONSTRAINT CK_Approval_Context
            CHECK (
                (id_employee IS NOT NULL AND IdRequest IS NULL) OR
                (id_employee IS NULL     AND IdRequest IS NOT NULL)
            )
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Notification' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.Notification (
        id_notification INT           IDENTITY(1,1) NOT NULL,
        id_approval     INT           NOT NULL,
        Recipient       NVARCHAR(100) NOT NULL,
        Message         NVARCHAR(MAX) NOT NULL,
        NotifType       TINYINT       NULL,       
        [Read]          BIT           NOT NULL DEFAULT (0),
        IsActioned      BIT           NOT NULL DEFAULT (0),
        DTNotification  DATETIME      NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT PK_Notification PRIMARY KEY CLUSTERED (id_notification),
        CONSTRAINT FK_Notification_Approval
            FOREIGN KEY (id_approval) REFERENCES dbo.Approval(id_approval),
        CONSTRAINT CK_Notification_Type
            CHECK (NotifType IN (1, 2, 3))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AuditLog' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.AuditLog (
        id_audit    INT           IDENTITY(1,1) NOT NULL,
        LastName    NVARCHAR(100) NOT NULL,
        FirstName   NVARCHAR(100) NOT NULL,
        AccountName NVARCHAR(100) NOT NULL,
        [DateTime]  DATETIME      NOT NULL DEFAULT (GETDATE()),
        Action      NVARCHAR(10)  NOT NULL,
        TargetTable NVARCHAR(100) NOT NULL,
        TargetId    INT           NULL,
        CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (id_audit),
        CONSTRAINT CK_AuditLog_Action
            CHECK (Action IN ('INSERT', 'UPDATE', 'DELETE'))
    );
END
GO
